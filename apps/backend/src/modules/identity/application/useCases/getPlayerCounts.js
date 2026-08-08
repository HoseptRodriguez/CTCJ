/**
 * Admin Dashboard support: how many JUGADORs the club has, broken down by
 * membership status -- "active players" is the ACTIVE bucket specifically,
 * the rest are shown for context. No new entity: a grouped count over the
 * existing User.membershipStatus column.
 *
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository, clubId: string }} deps
 */
export function createGetPlayerCounts({ userRepository, clubId }) {
  return async function getPlayerCounts() {
    const counts = await userRepository.countPlayersByMembershipStatus(clubId);
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    return { ...counts, total };
  };
}
