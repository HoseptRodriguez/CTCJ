/**
 * Thin read used by booking's GuardianshipProvider adapter (Phase 6) --
 * booking's application layer never sees the guardianship repository
 * directly, only this single-purpose function.
 *
 * @param {{ guardianshipRepository: import('../ports/GuardianshipRepository.js').GuardianshipRepository }} deps
 */
export function createCanBookForMinor({ guardianshipRepository }) {
  /**
   * @param {{ guardianUserId: string, minorUserId: string }} input
   */
  return async function canBookForMinor({ guardianUserId, minorUserId }) {
    const canBook = await guardianshipRepository.existsApprovedBookable(
      guardianUserId,
      minorUserId,
    );
    return { canBook };
  };
}
