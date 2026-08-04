/**
 * Batch name/email lookup used by billing's PlayerDirectoryProvider adapter
 * (Phase 9) to enrich club-wide invoice listings with player names -- billing
 * never sees the user repository directly, only this. Unknown ids are
 * silently omitted, not an error (fail-open: this is display enrichment, not
 * an authorization gate).
 *
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository }} deps
 */
export function createGetUserSummaries({ userRepository }) {
  /**
   * @param {{ userIds: string[] }} input
   */
  return async function getUserSummaries({ userIds }) {
    if (userIds.length === 0) return [];
    return userRepository.findByIds(userIds);
  };
}
