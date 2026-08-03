/**
 * Enriches each row with the minor's own email -- the caller (their own
 * guardian dashboard, and the booking-for-a-minor selector) needs to show
 * and identify the minor, not just an opaque userId.
 *
 * @param {{
 *   guardianshipRepository: import('../ports/GuardianshipRepository.js').GuardianshipRepository,
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 * }} deps
 */
export function createListMyGuardianships({ guardianshipRepository, userRepository }) {
  /**
   * @param {{ guardianUserId: string }} input
   */
  return async function listMyGuardianships({ guardianUserId }) {
    const rows = await guardianshipRepository.listByGuardian(guardianUserId);
    return Promise.all(
      rows.map(async (row) => {
        const minor = await userRepository.findById(row.minorUserId);
        return { ...row, minorEmail: minor?.email ?? null };
      }),
    );
  };
}
