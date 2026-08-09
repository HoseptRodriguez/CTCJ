import { randomUUID } from 'node:crypto';

import { REPORT_TARGET_TYPE } from '@ctcj/shared';

import { ContentNotFound } from '../errors/ContentNotFound.js';
import { ReportAlreadyPending } from '../errors/ReportAlreadyPending.js';
import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';

/**
 * Generic over POST/COMMENT -- one use case, not two, dispatching to
 * whichever repository matches targetType.
 *
 * @param {{
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   commentRepository: import('../ports/CommentRepository.js').CommentRepository,
 *   reportRepository: import('../ports/ReportRepository.js').ReportRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createReportContent({
  postRepository,
  commentRepository,
  reportRepository,
  playerEligibilityProvider,
  clock,
}) {
  /** @param {{ reporterUserId: string, targetType: string, targetId: string, reason?: string }} input */
  return async function reportContent({ reporterUserId, targetType, targetId, reason = null }) {
    const eligible = await playerEligibilityProvider.isEligiblePlayer(reporterUserId);
    if (!eligible) {
      throw new PlayerNotEligible();
    }

    const target =
      targetType === REPORT_TARGET_TYPE.POST
        ? await postRepository.findById(targetId)
        : await commentRepository.findById(targetId);
    if (!target) {
      throw new ContentNotFound();
    }

    const existing = await reportRepository.findPendingByTarget(
      targetType,
      targetId,
      reporterUserId,
    );
    if (existing) {
      throw new ReportAlreadyPending();
    }

    return reportRepository.create({
      id: randomUUID(),
      targetType,
      targetId,
      reporterId: reporterUserId,
      reason,
      createdAt: clock.now(),
    });
  };
}
