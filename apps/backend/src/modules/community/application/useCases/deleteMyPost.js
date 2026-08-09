import { PostNotFound } from '../errors/PostNotFound.js';

/**
 * @param {{ postRepository: import('../ports/PostRepository.js').PostRepository }} deps
 */
export function createDeleteMyPost({ postRepository }) {
  /** @param {{ userId: string, postId: string }} input */
  return async function deleteMyPost({ userId, postId }) {
    const post = await postRepository.findById(postId);
    if (!post || post.authorId !== userId) {
      throw new PostNotFound();
    }
    await postRepository.delete(postId);
  };
}
