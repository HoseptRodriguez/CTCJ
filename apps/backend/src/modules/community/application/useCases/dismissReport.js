import { REPORT_STATUS } from '@ctcj/shared';

import { ReportNotFound } from '../errors/ReportNotFound.js';

/**
 * Staff-only. Marks a report resolved without touching the content --
 * the "this isn't actually a problem" outcome, as opposed to
 * deleteContentAsStaff.js's "this needs to come down" outcome.
 *
 * @param {{
 *   reportRepository: import('../ports/ReportRepository.js').ReportRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createDismissReport({ reportRepository, clock }) {
  /** @param {{ reportId: string, staffUserId: string }} input */
  return async function dismissReport({ reportId, staffUserId }) {
    const report = await reportRepository.findById(reportId);
    if (!report || report.status !== REPORT_STATUS.PENDING) {
      throw new ReportNotFound();
    }
    return reportRepository.dismiss(reportId, staffUserId, clock.now());
  };
}
