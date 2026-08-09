import { describe, expect, it } from 'vitest';

import { createCreateComment } from '../../../../src/modules/community/application/useCases/createComment.js';
import { PlayerNotEligible } from '../../../../src/modules/community/application/errors/PlayerNotEligible.js';
import { PostNotFound } from '../../../../src/modules/community/application/errors/PostNotFound.js';

import {
  createFakePostRepository,
  createFakeCommentRepository,
  createFakePlayerEligibilityProvider,
  createFakePlayerDirectoryProvider,
  createFakeNotificationSender,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-08-16T10:00:00Z');

function buildDeps() {
  const postRepository = createFakePostRepository();
  postRepository._seed({
    id: 'post-1',
    authorId: 'player-1',
    content: 'hola',
    createdAt: new Date('2026-08-15'),
  });
  return {
    postRepository,
    commentRepository: createFakeCommentRepository(),
    playerEligibilityProvider: createFakePlayerEligibilityProvider(
      new Set(['player-1', 'player-2']),
    ),
    playerDirectoryProvider: createFakePlayerDirectoryProvider(
      new Map([['player-2', { firstName: 'Luis', lastName: 'Perez' }]]),
    ),
    notificationSender: createFakeNotificationSender(),
    clock: createFakeClock(NOW),
  };
}

describe('createComment', () => {
  it('creates a comment and notifies the post author', async () => {
    const deps = buildDeps();
    const createComment = createCreateComment(deps);

    const comment = await createComment({
      postId: 'post-1',
      authorUserId: 'player-2',
      content: 'Bien jugado!',
    });

    expect(comment).toMatchObject({ postId: 'post-1', authorId: 'player-2' });
    expect(deps.notificationSender.sent).toHaveLength(1);
    expect(deps.notificationSender.sent[0]).toMatchObject({
      recipientId: 'player-1',
      type: 'POST_COMMENT_RECEIVED',
    });
  });

  it('does not notify when commenting on your own post', async () => {
    const deps = buildDeps();
    const createComment = createCreateComment(deps);

    await createComment({ postId: 'post-1', authorUserId: 'player-1', content: 'nota propia' });

    expect(deps.notificationSender.sent).toHaveLength(0);
  });

  it('throws PlayerNotEligible for a non-JUGADOR', async () => {
    const deps = buildDeps();
    const createComment = createCreateComment(deps);

    await expect(
      createComment({ postId: 'post-1', authorUserId: 'outsider', content: 'hola' }),
    ).rejects.toThrow(PlayerNotEligible);
  });

  it('throws PostNotFound for an unknown post', async () => {
    const deps = buildDeps();
    const createComment = createCreateComment(deps);

    await expect(
      createComment({ postId: 'nonexistent', authorUserId: 'player-2', content: 'hola' }),
    ).rejects.toThrow(PostNotFound);
  });
});
