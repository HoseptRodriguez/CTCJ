import { describe, expect, it } from 'vitest';

import { createListComments } from '../../../../src/modules/community/application/useCases/listComments.js';

import { createFakeCommentRepository, createFakePlayerDirectoryProvider } from './fakes.js';

describe('listComments', () => {
  it('returns an empty list for a post with no comments', async () => {
    const listComments = createListComments({
      commentRepository: createFakeCommentRepository(),
      playerDirectoryProvider: createFakePlayerDirectoryProvider(),
    });
    expect(await listComments({ postId: 'post-1' })).toEqual({ comments: [] });
  });

  it('returns comments oldest-first, enriched with author names', async () => {
    const commentRepository = createFakeCommentRepository();
    commentRepository._seed({
      id: 'c2',
      postId: 'post-1',
      authorId: 'player-2',
      content: 'segundo',
      createdAt: new Date('2026-08-16T11:00:00Z'),
    });
    commentRepository._seed({
      id: 'c1',
      postId: 'post-1',
      authorId: 'player-1',
      content: 'primero',
      createdAt: new Date('2026-08-16T10:00:00Z'),
    });
    const playerDirectoryProvider = createFakePlayerDirectoryProvider(
      new Map([
        ['player-1', { firstName: 'Ana', lastName: 'Gomez' }],
        ['player-2', { firstName: 'Luis', lastName: 'Perez' }],
      ]),
    );
    const listComments = createListComments({ commentRepository, playerDirectoryProvider });

    const result = await listComments({ postId: 'post-1' });

    expect(result.comments.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(result.comments[0].author).toEqual({
      id: 'player-1',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
  });
});
