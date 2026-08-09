/**
 * No post-existence check -- unliking is pure removal, idempotent either
 * way (a like row for a nonexistent post can't exist, so this is always
 * safe as a no-op).
 * @param {{ postLikeRepository: import('../ports/PostLikeRepository.js').PostLikeRepository }} deps
 */
export function createUnlikePost({ postLikeRepository }) {
  /** @param {{ userId: string, postId: string }} input */
  return async function unlikePost({ userId, postId }) {
    await postLikeRepository.unlike(postId, userId);
  };
}
