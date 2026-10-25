import { PostNotFound } from '../errors/PostNotFound.js';

/**
 * Deletes the post (its post_media rows cascade) and then its files in
 * storage -- best effort, after the database delete succeeded.
 *
 * @param {{
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   mediaStorage?: import('../ports/MediaStorage.js').MediaStorage,
 * }} deps
 */
export function createDeleteMyPost({ postRepository, mediaStorage }) {
  /** @param {{ userId: string, postId: string }} input */
  return async function deleteMyPost({ userId, postId }) {
    const post = await postRepository.findById(postId);
    if (!post || post.authorId !== userId) {
      throw new PostNotFound();
    }
    const deleted = await postRepository.delete(postId);
    await mediaStorage?.deleteMany(deleted?.mediaUrls ?? []);
  };
}
