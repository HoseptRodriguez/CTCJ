/**
 * @param {{
 *   commentRepository: import('../ports/CommentRepository.js').CommentRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 * }} deps
 */
export function createListComments({ commentRepository, playerDirectoryProvider }) {
  /** @param {{ postId: string }} input */
  return async function listComments({ postId }) {
    const comments = await commentRepository.listByPost(postId);
    if (comments.length === 0) {
      return { comments: [] };
    }

    const authorIds = [...new Set(comments.map((c) => c.authorId))];
    const summaries = await playerDirectoryProvider.getPlayerSummaries(authorIds);

    const enriched = comments.map((c) => {
      const author = summaries.get(c.authorId);
      return {
        ...c,
        author: author
          ? { id: c.authorId, firstName: author.firstName, lastName: author.lastName }
          : null,
      };
    });

    return { comments: enriched };
  };
}
