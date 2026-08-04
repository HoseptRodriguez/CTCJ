import { resolveClubDayRangeUtc } from '../../domain/policies/scheduleWindow.js';

/**
 * @param {{ paymentRepository: import('../ports/PaymentRepository.js').PaymentRepository }} deps
 */
export function createListPaymentsByDateRange({ paymentRepository }) {
  /**
   * @param {{ from: string, to: string }} input club-local (America/Bogota) YYYY-MM-DD, inclusive on both ends
   */
  return async function listPaymentsByDateRange({ from, to }) {
    const rangeStart = resolveClubDayRangeUtc(from).dayStart;
    const rangeEnd = resolveClubDayRangeUtc(to).dayEnd;

    const [payments, totals] = await Promise.all([
      paymentRepository.listByDateRange(rangeStart, rangeEnd),
      paymentRepository.getTotals(rangeStart, rangeEnd),
    ]);
    return { payments, totalCop: totals.totalCop, count: totals.count };
  };
}
