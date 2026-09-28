import {
  COMMUNITY_RULES_ACCEPTANCE,
  CONSENT_ACTION,
  CONSENT_TYPE,
  COOKIES_POLICY,
  HEALTH_DATA_AUTHORIZATION,
  MARKETING_AUTHORIZATION,
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
  };
}
