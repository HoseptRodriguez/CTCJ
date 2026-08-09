export class PostLikeRepository {
  /** Idempotent -- liking an already-liked post is a no-op, not an error.
   * @returns {Promise<void>} */
  async like(_postId, _userId, _now) {
    throw new Error('Not implemented');
  }

  /** Idempotent -- unliking a not-liked post is a no-op.
   * @returns {Promise<void>} */
  async unlike(_postId, _userId) {
    throw new Error('Not implemented');
  }

  /** Batch membership check for feed enrichment (mirrors
   * PlayerDirectoryProvider.getPlayerSummaries' Map-returning convention).
   * @returns {Promise<Set<string>>} the subset of postIds this user has liked */
  async listLikedPostIds(_postIds, _userId) {
    throw new Error('Not implemented');
  }
}
