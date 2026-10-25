import {
  AUTO_HIDE_REPORT_THRESHOLD,
  POST_HIDDEN_REASON,
  REPORT_STATUS,
  REPORT_TARGET_TYPE,
} from '@ctcj/shared';

import { ReportNotFound } from '../errors/ReportNotFound.js';

/**
 * Staff-only. Marks a report resolved without touching the content --
 * the "this isn't actually a problem" outcome, as opposed to
 * deleteContentAsStaff.js's "this needs to come down" outcome. A post hidden
 * automatically by reports shows again once, after the review, fewer than
 * AUTO_HIDE_REPORT_THRESHOLD reports remain pending (a staff hide stays).
 *
 * @param {{
 *   reportRepository: import('../ports/ReportRepository.js').ReportRepository,
 *   postRepository?: import('../ports/PostRepository.js').PostRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createDismissReport({ reportRepository, postRepository, clock }) {
  /** @param {{ reportId: string, staffUserId: string }} input */
  return async function dismissReport({ reportId, staffUserId }) {
    const report = await reportRepository.findById(reportId);
    if (!report || report.status !== REPORT_STATUS.PENDING) {
      throw new ReportNotFound();
    }
    const dismissed = await reportRepository.dismiss(reportId, staffUserId, clock.now());
    if (postRepository && report.targetType === REPORT_TARGET_TYPE.POST) {
      const post = await postRepository.findById(report.targetId);
      if (post?.hiddenReason === POST_HIDDEN_REASON.AUTO_REPORTS) {
        const pending = await reportRepository.countPendingByTarget(
          REPORT_TARGET_TYPE.POST,
          post.id,
        );
        if (pending < AUTO_HIDE_REPORT_THRESHOLD) await postRepository.unhide(post.id);
      }
    }
    return dismissed;
  };
}
