import { describe, expect, it } from 'vitest';

import { createListPosts } from '../../../../src/modules/community/application/useCases/listPosts.js';

import {
  createFakePostRepository,
  createFakePostLikeRepository,
  createFakePlayerDirectoryProvider,
} from './fakes.js';

function buildDeps() {
  const postRepository = createFakePostRepository();
  const postLikeRepository = createFakePostLikeRepository();
  const playerDirectoryProvider = createFakePlayerDirectoryProvider(
    new Map([['player-1', { firstName: 'Ana', lastName: 'Gomez' }]]),
  );
  return { postRepository, postLikeRepository, playerDirectoryProvider };
}

describe('listPosts', () => {
  it('returns an empty list when there are no posts', async () => {
    const deps = buildDeps();
    const listPosts = createListPosts(deps);
    expect(await listPosts({ callerUserId: 'player-2' })).toEqual({ posts: [] });
  });

  it('enriches each post with author name, counts, and likedByMe', async () => {
    const deps = buildDeps();
    deps.postRepository._seed({
      id: 'post-1',
      authorId: 'player-1',
      content: 'Hola',
      createdAt: new Date('2026-08-16'),
      commentCount: 2,
      likeCount: 3,
    });
    await deps.postLikeRepository.like('post-1', 'player-2');
    const listPosts = createListPosts(deps);

    const result = await listPosts({ callerUserId: 'player-2' });

    expect(result.posts).toEqual([
      expect.objectContaining({
        id: 'post-1',
        author: { id: 'player-1', firstName: 'Ana', lastName: 'Gomez' },
        commentCount: 2,
        likeCount: 3,
        likedByMe: true,
      }),
    ]);
  });

  it('likedByMe is false when the caller has not liked the post', async () => {
    const deps = buildDeps();
    deps.postRepository._seed({
      id: 'post-1',
      authorId: 'player-1',
      content: 'Hola',
      createdAt: new Date('2026-08-16'),
    });
    const listPosts = createListPosts(deps);

    const result = await listPosts({ callerUserId: 'player-2' });

    expect(result.posts[0].likedByMe).toBe(false);
  });

  it('author is null for an unresolvable author id (fail-open display enrichment)', async () => {
    const deps = buildDeps();
    deps.postRepository._seed({
      id: 'post-1',
      authorId: 'unknown-user',
      content: 'Hola',
      createdAt: new Date('2026-08-16'),
    });
    const listPosts = createListPosts(deps);

    const result = await listPosts({ callerUserId: 'player-2' });

    expect(result.posts[0].author).toBeNull();
  });
});
