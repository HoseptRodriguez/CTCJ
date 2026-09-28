import { randomUUID } from 'node:crypto';

import { NOTIFICATION_TYPE } from '@ctcj/shared';

import { MinorPendingGuardianAuthorization } from '../errors/MinorPendingGuardianAuthorization.js';
import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';
import { PostNotFound } from '../errors/PostNotFound.js';

/**
 * @param {{
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   commentRepository: import('../ports/CommentRepository.js').CommentRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 *   notificationSender: import('../ports/NotificationSender.js').NotificationSender,
 *   clock: import('../ports/Clock.js').Clock,
 *   minorStatusProvider?: import('../ports/MinorStatusProvider.js').MinorStatusProvider,
 * }} deps
 */
export function createCreateComment({
  minorStatusProvider,
  postRepository,
  commentRepository,
  playerEligibilityProvider,
  playerDirectoryProvider,
  notificationSender,
  clock,
}) {
  /** @param {{ postId: string, authorUserId: string, content: string }} input */
  return async function createComment({ postId, authorUserId, content }) {
    const eligible = await playerEligibilityProvider.isEligiblePlayer(authorUserId);
    if (!eligible) {
      throw new PlayerNotEligible();
    }
    if (await minorStatusProvider?.isPendingGuardianAuthorization(authorUserId)) {
      throw new MinorPendingGuardianAuthorization();
    }

    const post = await postRepository.findById(postId);
    if (!post) {
      throw new PostNotFound();
    }

    const created = await commentRepository.create({
      id: randomUUID(),
      postId,
      authorId: authorUserId,
      content,
      createdAt: clock.now(),
    });

    // Never notify yourself for a comment on your own post.
    if (post.authorId !== authorUserId) {
      const summaries = await playerDirectoryProvider.getPlayerSummaries([authorUserId]);
      const commenterName = summaries.get(authorUserId);
      const commenterLabel = commenterName
        ? `${commenterName.firstName} ${commenterName.lastName}`
        : 'Un jugador';
      await notificationSender.notify({
        recipientId: post.authorId,
        type: NOTIFICATION_TYPE.POST_COMMENT_RECEIVED,
        title: 'Nuevo comentario',
        body: `${commenterLabel} comentó tu publicación.`,
        linkPath: '/mi-ctcj/comunidad',
      });
    }

    return created;
  };
}
