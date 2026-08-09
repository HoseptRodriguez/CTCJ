import { describe, expect, it } from 'vitest';

import { createDismissReport } from '../../../../src/modules/community/application/useCases/dismissReport.js';
import { ReportNotFound } from '../../../../src/modules/community/application/errors/ReportNotFound.js';

import { createFakeReportRepository, createFakeClock } from './fakes.js';

const NOW = new Date('2026-08-17T10:00:00Z');

describe('dismissReport', () => {
  it('dismisses a PENDING report, stamping resolvedAt/resolvedBy', async () => {
    const reportRepository = createFakeReportRepository();
    reportRepository._seed({
      id: 'report-1',
      targetType: 'POST',
      targetId: 'post-1',
      reporterId: 'player-2',
      reason: null,
      createdAt: new Date('2026-08-16'),
    });
    const dismissReport = createDismissReport({ reportRepository, clock: createFakeClock(NOW) });

    const result = await dismissReport({ reportId: 'report-1', staffUserId: 'staff-1' });

    expect(result).toMatchObject({ status: 'DISMISSED', resolvedAt: NOW, resolvedBy: 'staff-1' });
  });

  it('throws ReportNotFound for an unknown report', async () => {
    const dismissReport = createDismissReport({
      reportRepository: createFakeReportRepository(),
      clock: createFakeClock(NOW),
    });
    await expect(
      dismissReport({ reportId: 'nonexistent', staffUserId: 'staff-1' }),
    ).rejects.toThrow(ReportNotFound);
  });

  it('throws ReportNotFound for an already-dismissed report', async () => {
    const reportRepository = createFakeReportRepository();
    reportRepository._seed({
      id: 'report-1',
      targetType: 'POST',
      targetId: 'post-1',
      reporterId: 'player-2',
      reason: null,
      status: 'DISMISSED',
      resolvedAt: new Date('2026-08-16'),
      resolvedBy: 'staff-1',
      createdAt: new Date('2026-08-15'),
    });
    const dismissReport = createDismissReport({ reportRepository, clock: createFakeClock(NOW) });

    await expect(dismissReport({ reportId: 'report-1', staffUserId: 'staff-2' })).rejects.toThrow(
      ReportNotFound,
    );
  });
});
