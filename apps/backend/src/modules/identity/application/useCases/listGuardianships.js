import { GUARDIANSHIP_STATUS } from '@ctcj/shared';

/**
 * Enriches each row with the guardian's and minor's own email -- the admin
 * review UI needs to show who is asking to link to whom, not just opaque ids.
 *
 * @param {{
 *   guardianshipRepository: import('../ports/GuardianshipRepository.js').GuardianshipRepository,
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 * }} deps
 */
export function createListGuardianships({ guardianshipRepository, userRepository }) {
  /**
   * @param {{ status?: string }} input
   */
  return async function listGuardianships({ status } = {}) {
    const rows = await guardianshipRepository.listByStatus(status ?? GUARDIANSHIP_STATUS.PENDING);
    return Promise.all(
      rows.map(async (row) => {
        const [guardian, minor] = await Promise.all([
          userRepository.findById(row.guardianUserId),
          userRepository.findById(row.minorUserId),
        ]);
        return {
          ...row,
          guardianEmail: guardian?.email ?? null,
          minorEmail: minor?.email ?? null,
        };
      }),
    );
  };
}
