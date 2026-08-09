import { describe, expect, it } from 'vitest';

import { createListReportedContent } from '../../../../src/modules/community/application/useCases/listReportedContent.js';

import {
  createFakePostRepository,
  createFakeCommentRepository,
  createFakeReportRepository,
  createFakePlayerDirectoryProvider,
} from './fakes.js';

describe('listReportedContent', () => {
  function buildDeps() {
    const postRepository = createFakePostRepository();
    postRepository._seed({
      id: 'post-1',
      authorId: 'player-1',
      content: 'contenido del post',
      createdAt: new Date('2026-08-15'),
    });
    const reportRepository = createFakeReportRepository();
    reportRepository._seed({
      id: 'report-1',
      targetType: 'POST',
      targetId: 'post-1',
      reporterId: 'player-2',
      reason: 'ofensivo',
      createdAt: new Date('2026-08-16'),
    });
    const playerDirectoryProvider = createFakePlayerDirectoryProvider(
      new Map([
        ['player-1', { firstName: 'Ana', lastName: 'Gomez' }],
        ['player-2', { firstName: 'Luis', lastName: 'Perez' }],
      ]),
    );
    return {
      postRepository,
      commentRepository: createFakeCommentRepository(),
      reportRepository,
      playerDirectoryProvider,
    };
  }

  it('defaults to PENDING and enriches with target content/author and reporter', async () => {
    const deps = buildDeps();
    const listReportedContent = createListReportedContent(deps);

    const result = await listReportedContent();

    expect(result.reports).toEqual([
      expect.objectContaining({
        id: 'report-1',
        targetContent: 'contenido del post',
        targetAuthor: { id: 'player-1', firstName: 'Ana', lastName: 'Gomez' },
        reporter: { id: 'player-2', firstName: 'Luis', lastName: 'Perez' },
      }),
    ]);
  });

  it('returns an empty list for a status with no reports', async () => {
    const deps = buildDeps();
    const listReportedContent = createListReportedContent(deps);
    expect(await listReportedContent({ status: 'DISMISSED' })).toEqual({ reports: [] });
  });

  it('targetContent is null if the target was already removed through some other path', async () => {
    const deps = buildDeps();
    await deps.postRepository.delete('post-1');
    const listReportedContent = createListReportedContent(deps);

    const result = await listReportedContent();

    expect(result.reports[0].targetContent).toBeNull();
    expect(result.reports[0].targetAuthor).toBeNull();
  });
});
