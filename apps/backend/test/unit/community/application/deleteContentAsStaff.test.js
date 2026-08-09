import { describe, expect, it } from 'vitest';

import { createDeleteContentAsStaff } from '../../../../src/modules/community/application/useCases/deleteContentAsStaff.js';
import { ContentNotFound } from '../../../../src/modules/community/application/errors/ContentNotFound.js';

import { createFakePostRepository, createFakeCommentRepository } from './fakes.js';

function buildDeps() {
  const postRepository = createFakePostRepository();
  postRepository._seed({
    id: 'post-1',
    authorId: 'player-1',
    content: 'hola',
    createdAt: new Date(),
  });
  const commentRepository = createFakeCommentRepository();
  commentRepository._seed({
    id: 'c1',
    postId: 'post-1',
    authorId: 'player-1',
    content: 'comentario',
    createdAt: new Date(),
  });
  return { postRepository, commentRepository };
}

describe('deleteContentAsStaff', () => {
  it('deletes a POST regardless of who owns it (no ownership filter)', async () => {
    const deps = buildDeps();
    const deleteContentAsStaff = createDeleteContentAsStaff(deps);

    await deleteContentAsStaff({ targetType: 'POST', targetId: 'post-1' });

    expect(await deps.postRepository.findById('post-1')).toBeNull();
  });

  it('deletes a COMMENT regardless of who owns it', async () => {
    const deps = buildDeps();
    const deleteContentAsStaff = createDeleteContentAsStaff(deps);

    await deleteContentAsStaff({ targetType: 'COMMENT', targetId: 'c1' });

    expect(await deps.commentRepository.findById('c1')).toBeNull();
  });

  it('throws ContentNotFound for an unknown POST', async () => {
    const deps = buildDeps();
    const deleteContentAsStaff = createDeleteContentAsStaff(deps);
    await expect(
      deleteContentAsStaff({ targetType: 'POST', targetId: 'nonexistent' }),
    ).rejects.toThrow(ContentNotFound);
  });

  it('throws ContentNotFound for an unknown COMMENT', async () => {
    const deps = buildDeps();
    const deleteContentAsStaff = createDeleteContentAsStaff(deps);
    await expect(
      deleteContentAsStaff({ targetType: 'COMMENT', targetId: 'nonexistent' }),
    ).rejects.toThrow(ContentNotFound);
  });
});
