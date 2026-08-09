import { CommentNotFound } from '../errors/CommentNotFound.js';

/**
 * @param {{ commentRepository: import('../ports/CommentRepository.js').CommentRepository }} deps
 */
export function createDeleteMyComment({ commentRepository }) {
  /** @param {{ userId: string, commentId: string }} input */
  return async function deleteMyComment({ userId, commentId }) {
    const comment = await commentRepository.findById(commentId);
    if (!comment || comment.authorId !== userId) {
      throw new CommentNotFound();
    }
    await commentRepository.delete(commentId);
  };
}
