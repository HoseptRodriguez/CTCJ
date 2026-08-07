// CTCJ operates in America/Bogota, a fixed UTC-5 offset with no DST -- own
// copy of this constant/month-math, mirroring booking's
// domain/policies/scheduleWindow.js exactly (each module owns its own copy
// rather than reaching into another module's domain layer for a few lines
// of date arithmetic).
const CLUB_UTC_OFFSET_HOURS = 5;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function clubMonthStartUtc(year, month) {
  return new Date(Date.UTC(year, month - 1, 1, CLUB_UTC_OFFSET_HOURS, 0, 0, 0));
}

function shiftMonth(year, month, delta) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/**
 * Cash flow (financial dashboard): membership-invoice revenue actually
 * collected (paidAt, not issuedAt) for the last `months` club-local
 * calendar months, oldest first, ending at the current club-local month.
 * Reuses invoiceRepository.getTotals per month rather than adding a new
 * grouped-aggregate repository method -- `months` is always small (<= 24),
 * so N parallel range queries is simpler and just as fast as a raw SQL
 * GROUP BY for this dashboard's scale.
 *
 * @param {{
 *   invoiceRepository: import('../ports/InvoiceRepository.js').InvoiceRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createGetMonthlyRevenue({ invoiceRepository, clock }) {
  /** @param {{ months: number }} input */
  return async function getMonthlyRevenue({ months }) {
    const clubLocalNow = new Date(clock.now().getTime() - CLUB_UTC_OFFSET_HOURS * 60 * 60 * 1000);
    const currentYear = clubLocalNow.getUTCFullYear();
    const currentMonth = clubLocalNow.getUTCMonth() + 1;

    const targetMonths = Array.from({ length: months }, (_, i) =>
      shiftMonth(currentYear, currentMonth, -(months - 1 - i)),
    );

    const totals = await Promise.all(
      targetMonths.map(({ year, month }) => {
        const { year: nextYear, month: nextMonth } = shiftMonth(year, month, 1);
        return invoiceRepository.getTotals({
          status: 'PAID',
          paidFrom: clubMonthStartUtc(year, month),
          paidTo: clubMonthStartUtc(nextYear, nextMonth),
        });
      }),
    );

    return {
      months: targetMonths.map(({ year, month }, i) => ({
        month: `${year}-${pad2(month)}`,
        totalCop: totals[i].totalCop,
        count: totals[i].count,
      })),
    };
  };
}
