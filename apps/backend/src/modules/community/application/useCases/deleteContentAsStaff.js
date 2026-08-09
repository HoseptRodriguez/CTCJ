import { REPORT_TARGET_TYPE } from '@ctcj/shared';

import { ContentNotFound } from '../errors/ContentNotFound.js';

/**
 * Staff-only moderation delete -- generic over POST/COMMENT, unlike
 * deleteMyPost.js/deleteMyComment.js this applies no ownership filter.
 * Report cleanup for the deleted target happens inside
 * postRepository.delete()/commentRepository.delete() themselves (see
 * those ports' own docstrings), so callers here don't need to know about
 * community_reports at all.
 *
 * @param {{
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   commentRepository: import('../ports/CommentRepository.js').CommentRepository,
 * }} deps
 */
export function createDeleteContentAsStaff({ postRepository, commentRepository }) {
  /** @param {{ targetType: string, targetId: string }} input */
  return async function deleteContentAsStaff({ targetType, targetId }) {
    if (targetType === REPORT_TARGET_TYPE.POST) {
      const post = await postRepository.findById(targetId);
      if (!post) {
        throw new ContentNotFound();
      }
      await postRepository.delete(targetId);
      return;
    }

    const comment = await commentRepository.findById(targetId);
    if (!comment) {
      throw new ContentNotFound();
    }
    await commentRepository.delete(targetId);
  };
}
