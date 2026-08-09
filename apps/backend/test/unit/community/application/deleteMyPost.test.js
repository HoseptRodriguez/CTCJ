import { describe, expect, it } from 'vitest';

import { createDeleteMyPost } from '../../../../src/modules/community/application/useCases/deleteMyPost.js';
import { PostNotFound } from '../../../../src/modules/community/application/errors/PostNotFound.js';

import { createFakePostRepository } from './fakes.js';

describe('deleteMyPost', () => {
  it('deletes a post owned by the caller', async () => {
    const postRepository = createFakePostRepository();
    postRepository._seed({
      id: 'post-1',
      authorId: 'player-1',
      content: 'hola',
      createdAt: new Date(),
    });
    const deleteMyPost = createDeleteMyPost({ postRepository });

    await deleteMyPost({ userId: 'player-1', postId: 'post-1' });

    expect(await postRepository.findById('post-1')).toBeNull();
  });

  it('throws PostNotFound for an unknown post', async () => {
    const postRepository = createFakePostRepository();
    const deleteMyPost = createDeleteMyPost({ postRepository });

    await expect(deleteMyPost({ userId: 'player-1', postId: 'nonexistent' })).rejects.toThrow(
      PostNotFound,
    );
  });

  it('throws PostNotFound (not a separate forbidden error) when the caller is not the author', async () => {
    const postRepository = createFakePostRepository();
    postRepository._seed({
      id: 'post-1',
      authorId: 'player-1',
      content: 'hola',
      createdAt: new Date(),
    });
    const deleteMyPost = createDeleteMyPost({ postRepository });

    await expect(deleteMyPost({ userId: 'player-2', postId: 'post-1' })).rejects.toThrow(
      PostNotFound,
    );
    expect(await postRepository.findById('post-1')).not.toBeNull();
  });
});
