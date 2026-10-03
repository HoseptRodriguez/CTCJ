import {
  COMMUNITY_RULES_ACCEPTANCE,
  CONSENT_ACTION,
  CONSENT_TYPE,
  COOKIES_POLICY,
  HEALTH_DATA_AUTHORIZATION,
  MARKETING_AUTHORIZATION,
  MINOR_PUBLIC_NAME_AUTHORIZATION,
  PROMOTIONAL_CATEGORIES,
} from '@ctcj/shared';

import { GuardianshipNotApproved } from '../errors/GuardianshipNotApproved.js';
import { GuardianshipNotFound } from '../errors/GuardianshipNotFound.js';
import { MarketingChannelRequired } from '../errors/MarketingChannelRequired.js';
import { MinorNeedsGuardian } from '../errors/MinorNeedsGuardian.js';
import { UnknownAuthorization } from '../errors/UnknownAuthorization.js';

/** The optional authorizations a person manages from "Mis datos y privacidad". */
const DOCUMENTS = {
  [CONSENT_TYPE.MARKETING]: MARKETING_AUTHORIZATION,
  [CONSENT_TYPE.HEALTH_DATA]: HEALTH_DATA_AUTHORIZATION,
  [CONSENT_TYPE.COMMUNITY_RULES]: COMMUNITY_RULES_ACCEPTANCE,
};

/** For a minor, only the guardian can accept these (Ley 1581 de 2012, art. 7). */
const GUARDIAN_ONLY = new Set([CONSENT_TYPE.MARKETING, CONSENT_TYPE.HEALTH_DATA]);

export const SELF_MANAGED_AUTHORIZATIONS = Object.freeze(Object.keys(DOCUMENTS));

/**
 * Optional authorizations: promotions (with channels), health data and the
 * Community rules. Each change is a new row in `consents` (append-only):
 * accepting adds ACCEPTED, withdrawing adds WITHDRAWN. Withdrawing is always
 * allowed; accepting marketing or health data for a minor is the guardian's.
 *
 * An authorization is "in force" when the latest row is ACCEPTED and, for a
 * minor, it was given by a guardian whose link is still APPROVED.
 *
 * @param {{
 *   consentRepository: import('../ports/ConsentRepository.js').ConsentRepository,
 *   guardianshipRepository: import('../ports/GuardianshipRepository.js').GuardianshipRepository,
 *   checkIsMinor: (input: { userId: string }) => Promise<{ isMinor: boolean }>,
 * }} deps
 */
export function createOptionalAuthorizationUseCases({
  consentRepository,
  guardianshipRepository,
  checkIsMinor,
}) {
  async function inForce(userId, consentType, isMinor) {
    const latest = await consentRepository.findLatest(userId, consentType);
    if (latest?.action !== CONSENT_ACTION.ACCEPTED) return null;
    if (!isMinor || !GUARDIAN_ONLY.has(consentType)) return latest;
    if (!latest.givenBy || latest.givenBy === userId) return null;
    const guardianship = await guardianshipRepository.findActiveForPair(latest.givenBy, userId);
    return guardianship?.status === 'APPROVED' ? latest : null;
  }

  function view(consentType, row) {
    const doc = DOCUMENTS[consentType];
    return {
      type: consentType,
      title: doc.title,
      currentVersion: doc.version,
      accepted: row != null,
      acceptedAt: row?.createdAt ?? null,
      acceptedVersion: row?.documentVersion ?? null,
      givenByGuardian: row != null && row.givenBy != null && row.givenBy !== row.userId,
      channels: consentType === CONSENT_TYPE.MARKETING ? (row?.details?.channels ?? []) : undefined,
    };
  }

  async function setMarketing({ userId, matrix, ipAddress = null, userAgent = null }) {
    const { isMinor } = await checkIsMinor({ userId });
    const categories = {};
    for (const category of PROMOTIONAL_CATEGORIES) {
      const channels = [];
      if (matrix?.[category]?.EMAIL) channels.push('email');
      if (matrix?.[category]?.APP) channels.push('app');
      if (channels.length) categories[category] = channels;
    }
    const anyOn = Object.keys(categories).length > 0;
    if (anyOn && isMinor) throw new MinorNeedsGuardian();
    const current = await inForce(userId, CONSENT_TYPE.MARKETING, isMinor);
    const keepWhatsapp = (current?.details?.channels ?? []).includes('whatsapp');
    const channels = [...new Set(Object.values(categories).flat())];
    if (keepWhatsapp) channels.push('whatsapp');
    const accept = channels.length > 0;
    await consentRepository.append({
      userId,
      consentType: CONSENT_TYPE.MARKETING,
      documentVersion: MARKETING_AUTHORIZATION.version,
      action: accept ? CONSENT_ACTION.ACCEPTED : CONSENT_ACTION.WITHDRAWN,
      details: accept ? { channels, categories } : null,
      ipAddress,
      userAgent,
    });
    const row = await inForce(userId, CONSENT_TYPE.MARKETING, isMinor);
    return { isMinor, givenByGuardian: false, matrix: marketingMatrix(row) };
  }

  async function approvedGuardianshipOf(guardianUserId, guardianshipId) {
    const guardianship = await guardianshipRepository.findById(guardianshipId);
    if (!guardianship || guardianship.guardianUserId !== guardianUserId) {
      throw new GuardianshipNotFound();
    }
    if (guardianship.status !== 'APPROVED') throw new GuardianshipNotApproved();
    return guardianship;
  }

  return {
    /** @param {{ userId: string }} input */
    async getMyAuthorizations({ userId }) {
      const { isMinor } = await checkIsMinor({ userId });
      const items = await Promise.all(
        SELF_MANAGED_AUTHORIZATIONS.map(async (type) =>
          view(type, await inForce(userId, type, isMinor)),
        ),
      );
      const cookies = await consentRepository.findLatest(userId, CONSENT_TYPE.COOKIES);
      return {
        isMinor,
        items,
        cookies: {
          currentVersion: COOKIES_POLICY.version,
          decidedAt: cookies?.createdAt ?? null,
          preferences: cookies?.details?.preferences === true,
          analytics: cookies?.details?.analytics === true,
        },
      };
    },

    /**
     * @param {{ userId: string, type: string, accept: boolean, channels?: string[],
     *   ipAddress?: string|null, userAgent?: string|null }} input
     */
    async setMyAuthorization({
      userId,
      type,
      accept,
      channels = [],
      ipAddress = null,
      userAgent = null,
    }) {
      if (!Object.hasOwn(DOCUMENTS, type)) throw new UnknownAuthorization();
      const { isMinor } = await checkIsMinor({ userId });
      if (accept && isMinor && GUARDIAN_ONLY.has(type)) throw new MinorNeedsGuardian();
      const unique = [...new Set(channels)];
      if (accept && type === CONSENT_TYPE.MARKETING && unique.length === 0) {
        throw new MarketingChannelRequired();
      }
      let details = null;
      if (accept && type === CONSENT_TYPE.MARKETING) details = { channels: unique };
      if (accept && type === CONSENT_TYPE.COMMUNITY_RULES) {
        details = { declaresPermissionOfPeopleShown: true };
      }
      await consentRepository.append({
        userId,
        consentType: type,
        documentVersion: DOCUMENTS[type].version,
        action: accept ? CONSENT_ACTION.ACCEPTED : CONSENT_ACTION.WITHDRAWN,
        details,
        ipAddress,
        userAgent,
      });
      return view(type, await inForce(userId, type, isMinor));
    },

    /**
     * For other modules (clinical, community): is this authorization in force?
     * @param {{ userId: string, type: string }} input
     */
    async hasAuthorizationInForce({ userId, type }) {
      const { isMinor } = await checkIsMinor({ userId });
      return (await inForce(userId, type, isMinor)) != null;
    },

    /** For the guardian's list: is the minor's health-data authorization in force. */
    async minorHealthAuthorizationFor({ guardianUserId, minorUserId }) {
      const row = await inForce(minorUserId, CONSENT_TYPE.HEALTH_DATA, true);
      return row && row.givenBy === guardianUserId
        ? { authorized: true, authorizedAt: row.createdAt, version: row.documentVersion }
        : { authorized: false, authorizedAt: null, version: null };
    },

    /**
     * The guardian accepts or withdraws the health-data authorization for a
     * linked minor.
     * @param {{ guardianUserId: string, guardianshipId: string, accept: boolean,
     *   ipAddress?: string|null, userAgent?: string|null }} input
     */
    async setMinorHealthAuthorization({
      guardianUserId,
      guardianshipId,
      accept,
      ipAddress = null,
      userAgent = null,
    }) {
      const guardianship = await approvedGuardianshipOf(guardianUserId, guardianshipId);
      const row = await consentRepository.append({
        userId: guardianship.minorUserId,
        givenBy: guardianUserId,
        consentType: CONSENT_TYPE.HEALTH_DATA,
        documentVersion: HEALTH_DATA_AUTHORIZATION.version,
        action: accept ? CONSENT_ACTION.ACCEPTED : CONSENT_ACTION.WITHDRAWN,
        ipAddress,
        userAgent,
      });
      return {
        guardianshipId,
        authorized: accept,
        authorizedAt: accept ? row.createdAt : null,
        version: accept ? row.documentVersion : null,
      };
    },

    /**
     * Mi CTCJ > Notificaciones: the promotional switches, per category and
     * channel, read from the MARKETING consent. An older consent without
     * categories counts for every promotional category on the channels it
     * named (it was a general "yes, by email").
     * @param {{ userId: string }} input
     */
    async getMarketingPreferences({ userId }) {
      const { isMinor } = await checkIsMinor({ userId });
      const row = await inForce(userId, CONSENT_TYPE.MARKETING, isMinor);
      return {
        isMinor,
        givenByGuardian: view(CONSENT_TYPE.MARKETING, row).givenByGuardian,
        matrix: marketingMatrix(row),
      };
    },

    /**
     * Saves the promotional switches as a new MARKETING consent row: ACCEPTED
     * with the chosen categories and channels, or WITHDRAWN when all are
     * off. WhatsApp, chosen elsewhere, is kept. A minor can't turn them on.
     * @param {{ userId: string, matrix: Record<string, { APP?: boolean, EMAIL?: boolean }>,
     *   ipAddress?: string|null, userAgent?: string|null }} input
     */
    setMarketingPreferences: setMarketing,

    /**
     * "Dejar de recibir estos correos": removes email from one promotional
     * category (or from all of them), keeping everything else as it was.
     * @param {{ userId: string, category?: string|null }} input
     */
    async stopMarketingEmails({ userId, category = null }) {
      const { isMinor } = await checkIsMinor({ userId });
      const matrix = marketingMatrix(await inForce(userId, CONSENT_TYPE.MARKETING, isMinor));
      for (const c of PROMOTIONAL_CATEGORIES) {
        if (!category || c === category) matrix[c].EMAIL = false;
      }
      if (isMinor) {
        // A minor's consent is the guardian's: withdrawing is always allowed.
        await consentRepository.append({
          userId,
          consentType: CONSENT_TYPE.MARKETING,
          documentVersion: MARKETING_AUTHORIZATION.version,
          action: CONSENT_ACTION.WITHDRAWN,
          details: null,
        });
        return;
      }
      await setMarketing({ userId, matrix });
    },

    /** For the guardian's list: may /torneos show the minor's full name? */
    async minorPublicNameFor({ guardianUserId, minorUserId }) {
      const row = await inForce(minorUserId, CONSENT_TYPE.MINOR_PUBLIC_NAME, true);
      return { authorized: Boolean(row && row.givenBy === guardianUserId) };
    },

    /**
     * The guardian allows or withdraws showing the minor's full name on the
     * public tournament pages.
     * @param {{ guardianUserId: string, guardianshipId: string, accept: boolean,
     *   ipAddress?: string|null, userAgent?: string|null }} input
     */
    async setMinorPublicName({
      guardianUserId,
      guardianshipId,
      accept,
      ipAddress = null,
      userAgent = null,
    }) {
      const guardianship = await approvedGuardianshipOf(guardianUserId, guardianshipId);
      await consentRepository.append({
        userId: guardianship.minorUserId,
        givenBy: guardianUserId,
        consentType: CONSENT_TYPE.MINOR_PUBLIC_NAME,
        documentVersion: MINOR_PUBLIC_NAME_AUTHORIZATION.version,
        action: accept ? CONSENT_ACTION.ACCEPTED : CONSENT_ACTION.WITHDRAWN,
        ipAddress,
        userAgent,
      });
      return { guardianshipId, authorized: accept };
    },

    /**
     * For the public tournament pages: which of these people may appear with
     * their full name. Adults always; a minor only with the guardian's
     * MINOR_PUBLIC_NAME authorization in force.
     * @param {{ userIds: string[] }} input
     * @returns {Promise<Set<string>>}
     */
    async fullNameAllowedFor({ userIds }) {
      const allowed = new Set();
      for (const userId of new Set(userIds)) {
        const { isMinor } = await checkIsMinor({ userId });
        if (!isMinor) allowed.add(userId);
        else if (await inForce(userId, CONSENT_TYPE.MINOR_PUBLIC_NAME, true)) allowed.add(userId);
      }
      return allowed;
    },
  };
}

/** Promotional switches from a MARKETING consent row (null = all off). */
function marketingMatrix(row) {
  const matrix = Object.fromEntries(
    PROMOTIONAL_CATEGORIES.map((c) => [c, { APP: false, EMAIL: false }]),
  );
  if (!row) return matrix;
  const categories = row.details?.categories;
  for (const c of PROMOTIONAL_CATEGORIES) {
    const channels = categories ? (categories[c] ?? []) : (row.details?.channels ?? []);
    matrix[c] = { APP: channels.includes('app'), EMAIL: channels.includes('email') };
  }
  return matrix;
}
