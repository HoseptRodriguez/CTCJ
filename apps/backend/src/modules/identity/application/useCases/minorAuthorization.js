import { CONSENT_ACTION, CONSENT_TYPE, MINOR_AUTHORIZATION } from '@ctcj/shared';

import { GuardianshipNotApproved } from '../errors/GuardianshipNotApproved.js';
import { GuardianshipNotFound } from '../errors/GuardianshipNotFound.js';

/**
 * A minor's account is "pending guardian authorization" until a guardian
 * with an APPROVED guardianship accepts the authorization for the minor's
 * data and image (Ley 1581 de 2012, art. 7; Ley 1098 de 2006). While
 * pending, the minor can sign in and look around, but can't book, post in
 * the Community or receive promotional messages.
 *
 * The proof lives in `consents` (user = the minor, givenBy = the guardian),
 * append-only: withdrawing adds a WITHDRAWN row, and the account is pending
 * again.
 *
 * @param {{
 *   consentRepository: import('../ports/ConsentRepository.js').ConsentRepository,
 *   guardianshipRepository: import('../ports/GuardianshipRepository.js').GuardianshipRepository,
 *   checkIsMinor: (input: { userId: string }) => Promise<{ isMinor: boolean }>,
 * }} deps
 */
export function createMinorAuthorizationUseCases({
  consentRepository,
  guardianshipRepository,
  checkIsMinor,
}) {
  /** The latest authorization for the minor, if it's in force (accepted by a currently approved guardian). */
  async function authorizationInForce(minorUserId) {
    const latest = await consentRepository.findLatest(minorUserId, CONSENT_TYPE.MINOR_DATA_IMAGE);
    if (latest?.action !== CONSENT_ACTION.ACCEPTED || !latest.givenBy) return null;
    const guardianship = await guardianshipRepository.findActiveForPair(
      latest.givenBy,
      minorUserId,
    );
    return guardianship?.status === 'APPROVED' ? latest : null;
  }

  async function approvedGuardianshipOf(guardianUserId, guardianshipId) {
    const guardianship = await guardianshipRepository.findById(guardianshipId);
    if (!guardianship || guardianship.guardianUserId !== guardianUserId) {
      throw new GuardianshipNotFound();
    }
    if (guardianship.status !== 'APPROVED') {
      throw new GuardianshipNotApproved();
    }
    return guardianship;
  }

  return {
    /**
     * What a signed-in person can't do yet because of their age.
     * @param {{ userId: string }} input
     */
    async getAccountRestrictions({ userId }) {
      const { isMinor } = await checkIsMinor({ userId });
      if (!isMinor) return { isMinor: false, pendingGuardianAuthorization: false };
      return {
        isMinor: true,
        pendingGuardianAuthorization: (await authorizationInForce(userId)) == null,
      };
    },

    /** @param {{ userId: string }} input */
    async isPendingGuardianAuthorization({ userId }) {
      const { isMinor } = await checkIsMinor({ userId });
      return isMinor && (await authorizationInForce(userId)) == null;
    },

    /** For the guardian's own list: is the authorization for this minor in force, and since when. */
    async minorAuthorizationFor({ guardianUserId, minorUserId }) {
      const inForce = await authorizationInForce(minorUserId);
      return inForce && inForce.givenBy === guardianUserId
        ? { authorized: true, authorizedAt: inForce.createdAt, version: inForce.documentVersion }
        : { authorized: false, authorizedAt: null, version: null };
    },

    /**
     * @param {{ guardianUserId: string, guardianshipId: string,
     *   ipAddress?: string|null, userAgent?: string|null }} input
     */
    async authorizeMinor({ guardianUserId, guardianshipId, ipAddress = null, userAgent = null }) {
      const guardianship = await approvedGuardianshipOf(guardianUserId, guardianshipId);
      const row = await consentRepository.append({
        userId: guardianship.minorUserId,
        givenBy: guardianUserId,
        consentType: CONSENT_TYPE.MINOR_DATA_IMAGE,
        documentVersion: MINOR_AUTHORIZATION.VERSION,
        action: CONSENT_ACTION.ACCEPTED,
        ipAddress,
        userAgent,
      });
      return {
        guardianshipId,
        authorized: true,
        authorizedAt: row.createdAt,
        version: row.documentVersion,
      };
    },

    /**
     * @param {{ guardianUserId: string, guardianshipId: string,
     *   ipAddress?: string|null, userAgent?: string|null }} input
     */
    async withdrawMinorAuthorization({
      guardianUserId,
      guardianshipId,
      ipAddress = null,
      userAgent = null,
    }) {
      const guardianship = await approvedGuardianshipOf(guardianUserId, guardianshipId);
      await consentRepository.append({
        userId: guardianship.minorUserId,
        givenBy: guardianUserId,
        consentType: CONSENT_TYPE.MINOR_DATA_IMAGE,
        documentVersion: MINOR_AUTHORIZATION.VERSION,
        action: CONSENT_ACTION.WITHDRAWN,
        ipAddress,
        userAgent,
      });
      return { guardianshipId, authorized: false, authorizedAt: null, version: null };
    },
  };
}
