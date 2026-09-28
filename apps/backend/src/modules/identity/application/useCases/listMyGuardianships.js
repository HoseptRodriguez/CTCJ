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
 * }} deps
 *
 * Each approved row also says whether this guardian's authorization for the
 * minor's data and image is in force (the minor's account is pending until
 * it is).
 */
export function createListMyGuardianships({
  guardianshipRepository,
  userRepository,
  minorAuthorizationFor,
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
        return { ...row, minorEmail: minor?.email ?? null, minorAuthorization };
      }),
    );
  };
}
