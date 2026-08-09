import { PostNotFound } from '../errors/PostNotFound.js';

/**
 * @param {{
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   postLikeRepository: import('../ports/PostLikeRepository.js').PostLikeRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createLikePost({ postRepository, postLikeRepository, clock }) {
  /** @param {{ userId: string, postId: string }} input */
  return async function likePost({ userId, postId }) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new PostNotFound();
    }
    await postLikeRepository.like(postId, userId, clock.now());
  };
}
