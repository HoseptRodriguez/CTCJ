import { describe, expect, it } from 'vitest';

import { createReportContent } from '../../../../src/modules/community/application/useCases/reportContent.js';
import { createDismissReport } from '../../../../src/modules/community/application/useCases/dismissReport.js';
import { createListPosts } from '../../../../src/modules/community/application/useCases/listPosts.js';
import { createSetPostVisibility } from '../../../../src/modules/community/application/useCases/setPostVisibility.js';

import {
  createFakeClock,
  createFakeCommentRepository,
  createFakePlayerDirectoryProvider,
  createFakePlayerEligibilityProvider,
  createFakePostLikeRepository,
  createFakePostRepository,
  createFakeReportRepository,
} from './fakes.js';

const NOW = new Date('2026-09-27T15:00:00Z');
const REASON = 'Aparece un menor sin autorización';

function setup() {
  const postRepository = createFakePostRepository();
  const reportRepository = createFakeReportRepository();
  const deps = {
    postRepository,
    reportRepository,
    commentRepository: createFakeCommentRepository(),
    postLikeRepository: createFakePostLikeRepository(),
    playerEligibilityProvider: createFakePlayerEligibilityProvider(
      new Set(['autor', 'r1', 'r2', 'r3', 'r4']),
    ),
    playerDirectoryProvider: createFakePlayerDirectoryProvider(),
    clock: createFakeClock(NOW),
  };
  postRepository._seed({ id: 'p1', authorId: 'autor', content: 'foto del torneo', createdAt: NOW });
  return {
    deps,
    report: createReportContent(deps),
    listPosts: createListPosts(deps),
    dismiss: createDismissReport(deps),
    visibility: createSetPostVisibility(deps),
  };
}
const feedOf = async (listPosts, viewer) =>
  (await listPosts({ callerUserId: viewer })).posts.map((p) => p.id);

describe('a post with 3 reports hides itself until staff review it', () => {
  it('2 reports: still visible; the 3rd (different players): hidden for everyone but its author', async () => {
    const { deps, report, listPosts } = setup();
    await report({ reporterUserId: 'r1', targetType: 'POST', targetId: 'p1', reason: REASON });
    await report({ reporterUserId: 'r2', targetType: 'POST', targetId: 'p1', reason: REASON });
    expect(await feedOf(listPosts, 'r4')).toEqual(['p1']);

    await report({ reporterUserId: 'r3', targetType: 'POST', targetId: 'p1', reason: REASON });
    expect((await deps.postRepository.findById('p1')).hiddenReason).toBe('AUTO_REPORTS');
    expect(await feedOf(listPosts, 'r4')).toEqual([]);
    expect(await feedOf(listPosts, 'autor')).toEqual(['p1']);
  });

  it('staff dismissing the reports shows it again; a staff hide stays until staff unhide it', async () => {
    const { deps, report, dismiss, listPosts, visibility } = setup();
    const reports = [];
    for (const r of ['r1', 'r2', 'r3']) {
      reports.push(
        await report({ reporterUserId: r, targetType: 'POST', targetId: 'p1', reason: REASON }),
      );
    }
    await dismiss({ reportId: reports[0].id, staffUserId: 'staff' });
    expect(await feedOf(listPosts, 'r4')).toEqual(['p1']);

    await visibility.hidePost({ postId: 'p1', staffUserId: 'staff' });
    await dismiss({ reportId: reports[1].id, staffUserId: 'staff' });
    expect((await deps.postRepository.findById('p1')).hiddenReason).toBe('STAFF');
    await visibility.unhidePost({ postId: 'p1' });
    expect(await feedOf(listPosts, 'r4')).toEqual(['p1']);
  });
});
