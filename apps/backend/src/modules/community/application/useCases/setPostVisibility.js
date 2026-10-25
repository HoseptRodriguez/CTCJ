import { POST_HIDDEN_REASON } from '@ctcj/shared';

import { PostNotFound } from '../errors/PostNotFound.js';

/**
 * Staff moderation: hide a post from the feed (it stays for review), or
 * show it again. Showing it again also clears an automatic hide.
 *
 * @param {{
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createSetPostVisibility({ postRepository, clock }) {
  return {
    /** @param {{ postId: string, staffUserId: string }} input */
    async hidePost({ postId, staffUserId }) {
      const post = await postRepository.findById(postId);
      if (!post) throw new PostNotFound();
      await postRepository.hide(postId, {
        reason: POST_HIDDEN_REASON.STAFF,
        by: staffUserId,
        at: clock.now(),
      });
    },

    /** @param {{ postId: string }} input */
    async unhidePost({ postId }) {
      const post = await postRepository.findById(postId);
      if (!post) throw new PostNotFound();
      await postRepository.unhide(postId);
    },
  };
}
