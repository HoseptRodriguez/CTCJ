import { describe, expect, it } from 'vitest';

import { createCreatePost } from '../../../../src/modules/community/application/useCases/createPost.js';
import { createCreateComment } from '../../../../src/modules/community/application/useCases/createComment.js';
import { MinorPendingGuardianAuthorization } from '../../../../src/modules/community/application/errors/MinorPendingGuardianAuthorization.js';

import {
  createFakeClock,
  createFakeCommentRepository,
  createFakeMinorStatusProvider,
  createFakeNotificationSender,
  createFakePlayerDirectoryProvider,
  createFakePlayerEligibilityProvider,
  createFakePostRepository,
} from './fakes.js';

const NOW = new Date('2026-09-28T15:00:00Z');

function setup() {
  const deps = {
    postRepository: createFakePostRepository(),
    commentRepository: createFakeCommentRepository(),
    playerEligibilityProvider: createFakePlayerEligibilityProvider(
      new Set(['hijo', 'autorizado', 'ana']),
    ),
    playerDirectoryProvider: createFakePlayerDirectoryProvider(),
    notificationSender: createFakeNotificationSender(),
    // "hijo": a minor pending guardian authorization; "autorizado": an authorized minor.
    minorStatusProvider: createFakeMinorStatusProvider(
      new Set(['hijo', 'autorizado']),
      new Set(['hijo']),
    ),
    clock: createFakeClock(NOW),
  };
  return { deps, createPost: createCreatePost(deps), createComment: createCreateComment(deps) };
}

describe('Community: a minor pending guardian authorization cannot post', () => {
  it('no post (not even text) and no comment until the guardian authorizes', async () => {
    const { createPost, createComment } = setup();
    await expect(createPost({ authorUserId: 'hijo', content: 'Hola' })).rejects.toThrow(
      MinorPendingGuardianAuthorization,
    );
    const post = await createPost({ authorUserId: 'ana', content: 'Partido el sábado' });
    await expect(
      createComment({ postId: post.id, authorUserId: 'hijo', content: '¡Voy!' }),
    ).rejects.toThrow(MinorPendingGuardianAuthorization);
  });

  it('an authorized minor posts text as before', async () => {
    const { createPost } = setup();
    await expect(
      createPost({ authorUserId: 'autorizado', content: 'Gané mi primer partido' }),
    ).resolves.toMatchObject({ content: 'Gané mi primer partido' });
  });
});
