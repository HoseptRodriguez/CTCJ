import {
  getClubLocalYearMonth,
  resolveClubMonthRangeUtc,
} from '../../domain/policies/scheduleWindow.js';

function shiftMonth(year, month, delta) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/**
 * Cash flow (financial dashboard): court-payment revenue for the last
 * `months` club-local calendar months, oldest first, ending at the current
 * club-local month. Reuses paymentRepository.getTotals per month rather
 * than adding a new grouped-aggregate repository method -- `months` is
 * always small (<= 24), so N parallel range queries is simpler and just as
 * fast as a raw SQL GROUP BY for this dashboard's scale.
 *
 * @param {{
 *   paymentRepository: import('../ports/PaymentRepository.js').PaymentRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createGetMonthlyRevenue({ paymentRepository, clock }) {
  /** @param {{ months: number }} input */
  return async function getMonthlyRevenue({ months }) {
    const { year: currentYear, month: currentMonth } = getClubLocalYearMonth(clock.now());

    const targetMonths = Array.from({ length: months }, (_, i) =>
      shiftMonth(currentYear, currentMonth, -(months - 1 - i)),
    );

    const totals = await Promise.all(
      targetMonths.map(({ year, month }) => {
        const { monthStart, monthEnd } = resolveClubMonthRangeUtc(year, month);
        return paymentRepository.getTotals(monthStart, monthEnd);
      }),
    );

    return {
      months: targetMonths.map(({ year, month }, i) => ({
        month: `${year}-${String(month).padStart(2, '0')}`,
        totalCop: totals[i].totalCop,
        count: totals[i].count,
      })),
    };
  };
}
