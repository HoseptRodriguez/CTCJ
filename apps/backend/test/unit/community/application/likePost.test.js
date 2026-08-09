import { describe, expect, it } from 'vitest';

import { createLikePost } from '../../../../src/modules/community/application/useCases/likePost.js';
import { createUnlikePost } from '../../../../src/modules/community/application/useCases/unlikePost.js';
import { PostNotFound } from '../../../../src/modules/community/application/errors/PostNotFound.js';

import {
  createFakePostRepository,
  createFakePostLikeRepository,
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
    postLikeRepository: createFakePostLikeRepository(),
    clock: createFakeClock(NOW),
  };
}

describe('likePost / unlikePost', () => {
  it('likes a post', async () => {
    const deps = buildDeps();
    const likePost = createLikePost(deps);

    await likePost({ userId: 'player-2', postId: 'post-1' });

    expect(deps.postLikeRepository._has('post-1', 'player-2')).toBe(true);
  });

  it('liking twice is idempotent', async () => {
    const deps = buildDeps();
    const likePost = createLikePost(deps);

    await likePost({ userId: 'player-2', postId: 'post-1' });
    await likePost({ userId: 'player-2', postId: 'post-1' });

    expect(deps.postLikeRepository._has('post-1', 'player-2')).toBe(true);
  });

  it('throws PostNotFound when liking a nonexistent post', async () => {
    const deps = buildDeps();
    const likePost = createLikePost(deps);
    await expect(likePost({ userId: 'player-2', postId: 'nonexistent' })).rejects.toThrow(
      PostNotFound,
    );
  });

  it('unlikes a post', async () => {
    const deps = buildDeps();
    const likePost = createLikePost(deps);
    const unlikePost = createUnlikePost(deps);
    await likePost({ userId: 'player-2', postId: 'post-1' });

    await unlikePost({ userId: 'player-2', postId: 'post-1' });

    expect(deps.postLikeRepository._has('post-1', 'player-2')).toBe(false);
  });

  it('unliking a not-liked post is idempotent (no error)', async () => {
    const deps = buildDeps();
    const unlikePost = createUnlikePost(deps);
    await expect(unlikePost({ userId: 'player-2', postId: 'post-1' })).resolves.toBeUndefined();
  });
});
