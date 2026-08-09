import { describe, expect, it } from 'vitest';

import { createDeleteMyComment } from '../../../../src/modules/community/application/useCases/deleteMyComment.js';
import { CommentNotFound } from '../../../../src/modules/community/application/errors/CommentNotFound.js';

import { createFakeCommentRepository } from './fakes.js';

describe('deleteMyComment', () => {
  it('deletes a comment owned by the caller', async () => {
    const commentRepository = createFakeCommentRepository();
    commentRepository._seed({
      id: 'c1',
      postId: 'post-1',
      authorId: 'player-1',
      content: 'hola',
      createdAt: new Date(),
    });
    const deleteMyComment = createDeleteMyComment({ commentRepository });

    await deleteMyComment({ userId: 'player-1', commentId: 'c1' });

    expect(await commentRepository.findById('c1')).toBeNull();
  });

  it('throws CommentNotFound for an unknown comment', async () => {
    const deleteMyComment = createDeleteMyComment({
      commentRepository: createFakeCommentRepository(),
    });
    await expect(deleteMyComment({ userId: 'player-1', commentId: 'nope' })).rejects.toThrow(
      CommentNotFound,
    );
  });

  it('throws CommentNotFound when the caller is not the author', async () => {
    const commentRepository = createFakeCommentRepository();
    commentRepository._seed({
      id: 'c1',
      postId: 'post-1',
      authorId: 'player-1',
      content: 'hola',
      createdAt: new Date(),
    });
    const deleteMyComment = createDeleteMyComment({ commentRepository });

    await expect(deleteMyComment({ userId: 'player-2', commentId: 'c1' })).rejects.toThrow(
      CommentNotFound,
    );
  });
});
