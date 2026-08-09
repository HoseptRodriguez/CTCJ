const DEFAULT_LIMIT = 20;

/**
 * Club-wide feed, newest first, cursor-paginated on createdAt (the one
 * place this module goes beyond the capped-list precedent used elsewhere
 * in this app -- a real feed genuinely accumulates unboundedly, unlike a
 * season's matches). JUGADOR-gating happens at the HTTP layer
 * (requireRole), not re-checked here, matching competition's read
 * use cases' identical precedent.
 *
 * @param {{
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   postLikeRepository: import('../ports/PostLikeRepository.js').PostLikeRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 * }} deps
 */
export function createListPosts({ postRepository, postLikeRepository, playerDirectoryProvider }) {
  /** @param {{ callerUserId: string, limit?: number, before?: Date }} input */
  return async function listPosts({ callerUserId, limit = DEFAULT_LIMIT, before } = {}) {
    const posts = await postRepository.listRecent({ limit, before });
    if (posts.length === 0) {
      return { posts: [] };
    }

    const authorIds = [...new Set(posts.map((p) => p.authorId))];
    const [summaries, likedPostIds] = await Promise.all([
      playerDirectoryProvider.getPlayerSummaries(authorIds),
      postLikeRepository.listLikedPostIds(
        posts.map((p) => p.id),
        callerUserId,
      ),
    ]);

    const enriched = posts.map((p) => {
      const author = summaries.get(p.authorId);
      return {
        ...p,
        author: author
          ? { id: p.authorId, firstName: author.firstName, lastName: author.lastName }
          : null,
        likedByMe: likedPostIds.has(p.id),
      };
    });

    return { posts: enriched };
  };
}
