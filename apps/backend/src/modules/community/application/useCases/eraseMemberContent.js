/**
 * When a person's account is deleted, everything they published in the
 * Community goes too: posts (with their photos and videos), comments, likes
 * and reports. Files are deleted after the database, best effort.
 *
 * @param {{
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   mediaStorage?: import('../ports/MediaStorage.js').MediaStorage,
 * }} deps
 */
export function createEraseMemberContent({ postRepository, mediaStorage }) {
  /** @param {{ userId: string }} input */
  return async function eraseMemberContent({ userId }) {
    const { posts, comments, mediaUrls } = await postRepository.eraseAuthor(userId);
    await mediaStorage?.deleteMany(mediaUrls).catch(() => {});
    return { posts, comments, files: mediaUrls.length };
  };
}
