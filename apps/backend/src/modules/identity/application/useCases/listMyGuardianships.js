/**
 * Enriches each row with the minor's own email -- the caller (their own
 * guardian dashboard, and the booking-for-a-minor selector) needs to show
 * and identify the minor, not just an opaque userId.
 *
 * @param {{
 *   guardianshipRepository: import('../ports/GuardianshipRepository.js').GuardianshipRepository,
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   minorAuthorizationFor?: (input: { guardianUserId: string, minorUserId: string }) =>
 *     Promise<{ authorized: boolean, authorizedAt: Date|null, version: string|null }>,
 *   minorHealthAuthorizationFor?: (input: { guardianUserId: string, minorUserId: string }) =>
 *     Promise<{ authorized: boolean, authorizedAt: Date|null, version: string|null }>,
 * }} deps
 *
 * Each approved row also says whether this guardian's authorization for the
 * minor's data and image is in force (the minor's account is pending until
 * it is), and whether the optional health-data authorization is.
 */
export function createListMyGuardianships({
  guardianshipRepository,
  userRepository,
  minorAuthorizationFor,
  minorHealthAuthorizationFor,
  minorPublicNameFor,
}) {
  /**
   * @param {{ guardianUserId: string }} input
   */
  return async function listMyGuardianships({ guardianUserId }) {
    const rows = await guardianshipRepository.listByGuardian(guardianUserId);
    return Promise.all(
      rows.map(async (row) => {
        const minor = await userRepository.findById(row.minorUserId);
        const minorAuthorization =
          row.status === 'APPROVED' && minorAuthorizationFor
            ? await minorAuthorizationFor({ guardianUserId, minorUserId: row.minorUserId })
            : { authorized: false, authorizedAt: null, version: null };
        const healthAuthorization =
          row.status === 'APPROVED' && minorHealthAuthorizationFor
            ? await minorHealthAuthorizationFor({ guardianUserId, minorUserId: row.minorUserId })
            : { authorized: false, authorizedAt: null, version: null };
        // May /torneos show the minor's full name?
        const publicNameAuthorization =
          row.status === 'APPROVED' && minorPublicNameFor
            ? await minorPublicNameFor({ guardianUserId, minorUserId: row.minorUserId })
            : { authorized: false };
        return {
          ...row,
          minorEmail: minor?.email ?? null,
          minorAuthorization,
          healthAuthorization,
          publicNameAuthorization,
        };
      }),
    );
  };
}
