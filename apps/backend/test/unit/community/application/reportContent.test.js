import { describe, expect, it } from 'vitest';

import { createReportContent } from '../../../../src/modules/community/application/useCases/reportContent.js';
import { ContentNotFound } from '../../../../src/modules/community/application/errors/ContentNotFound.js';
import { ReportAlreadyPending } from '../../../../src/modules/community/application/errors/ReportAlreadyPending.js';
import { PlayerNotEligible } from '../../../../src/modules/community/application/errors/PlayerNotEligible.js';

import {
  createFakePostRepository,
  createFakeCommentRepository,
  createFakeReportRepository,
  createFakePlayerEligibilityProvider,
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
  const commentRepository = createFakeCommentRepository();
  commentRepository._seed({
    id: 'c1',
    postId: 'post-1',
    authorId: 'player-1',
    content: 'comentario',
    createdAt: new Date('2026-08-15'),
  });
  return {
    postRepository,
    commentRepository,
    reportRepository: createFakeReportRepository(),
    playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-2'])),
    clock: createFakeClock(NOW),
  };
}

describe('reportContent', () => {
  it('reports a POST', async () => {
    const deps = buildDeps();
    const reportContent = createReportContent(deps);

    const report = await reportContent({
      reporterUserId: 'player-2',
      targetType: 'POST',
      targetId: 'post-1',
      reason: 'Contenido inapropiado',
    });

    expect(report).toMatchObject({
      targetType: 'POST',
      targetId: 'post-1',
      reporterId: 'player-2',
      status: 'PENDING',
    });
  });

  it('reports a COMMENT', async () => {
    const deps = buildDeps();
    const reportContent = createReportContent(deps);

    const report = await reportContent({
      reporterUserId: 'player-2',
      targetType: 'COMMENT',
      targetId: 'c1',
    });

    expect(report).toMatchObject({ targetType: 'COMMENT', targetId: 'c1' });
  });

  it('throws PlayerNotEligible for a non-JUGADOR', async () => {
    const deps = buildDeps();
    const reportContent = createReportContent(deps);
    await expect(
      reportContent({ reporterUserId: 'outsider', targetType: 'POST', targetId: 'post-1' }),
    ).rejects.toThrow(PlayerNotEligible);
  });

  it('throws ContentNotFound for an unknown target', async () => {
    const deps = buildDeps();
    const reportContent = createReportContent(deps);
    await expect(
      reportContent({ reporterUserId: 'player-2', targetType: 'POST', targetId: 'nonexistent' }),
    ).rejects.toThrow(ContentNotFound);
  });

  it('throws ReportAlreadyPending on a second report from the same reporter on the same target', async () => {
    const deps = buildDeps();
    const reportContent = createReportContent(deps);
    await reportContent({ reporterUserId: 'player-2', targetType: 'POST', targetId: 'post-1' });

    await expect(
      reportContent({ reporterUserId: 'player-2', targetType: 'POST', targetId: 'post-1' }),
    ).rejects.toThrow(ReportAlreadyPending);
  });

  it('allows two different reporters to report the same target', async () => {
    const deps = buildDeps();
    deps.playerEligibilityProvider = createFakePlayerEligibilityProvider(
      new Set(['player-2', 'player-3']),
    );
    const reportContent = createReportContent(deps);
    await reportContent({ reporterUserId: 'player-2', targetType: 'POST', targetId: 'post-1' });

    await expect(
      reportContent({ reporterUserId: 'player-3', targetType: 'POST', targetId: 'post-1' }),
    ).resolves.toMatchObject({ reporterId: 'player-3' });
  });
});
