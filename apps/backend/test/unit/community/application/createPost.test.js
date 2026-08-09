import { describe, expect, it } from 'vitest';

import { createCreatePost } from '../../../../src/modules/community/application/useCases/createPost.js';
import { PlayerNotEligible } from '../../../../src/modules/community/application/errors/PlayerNotEligible.js';

import {
  createFakePostRepository,
  createFakePlayerEligibilityProvider,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-08-16T10:00:00Z');

describe('createPost', () => {
  it('creates a post for an eligible player', async () => {
    const postRepository = createFakePostRepository();
    const createPost = createCreatePost({
      postRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-1'])),
      clock: createFakeClock(NOW),
    });

    const post = await createPost({ authorUserId: 'player-1', content: 'Buen partido hoy!' });

    expect(post).toMatchObject({ authorId: 'player-1', content: 'Buen partido hoy!' });
    expect(post.createdAt).toBe(NOW);
  });

  it('throws PlayerNotEligible for a non-JUGADOR', async () => {
    const postRepository = createFakePostRepository();
    const createPost = createCreatePost({
      postRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set()),
      clock: createFakeClock(NOW),
    });

    await expect(createPost({ authorUserId: 'not-a-player', content: 'hola' })).rejects.toThrow(
      PlayerNotEligible,
    );
  });
});
