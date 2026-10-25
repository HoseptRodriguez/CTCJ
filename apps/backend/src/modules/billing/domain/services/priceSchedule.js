/**
 * Dates of a plan price change, in the club's calendar (Fusagasugá). Prices
 * are date-only (membership_plan_prices.valid_from is a DATE), represented
 * here as Dates at 00:00 UTC of that calendar day, as Prisma reads them.
 */

const CLUB_TIME_ZONE = 'America/Bogota';
const DAY_MS = 24 * 60 * 60 * 1000;

const clubDateKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLUB_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's date in the club, as 00:00 UTC of that day. */
export function clubToday(now) {
  return new Date(`${clubDateKey.format(now)}T00:00:00Z`);
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * The earliest day a new price can start. A change to a plan that has
 * active players waits the notice period, so they are told in advance; the
 * first price of a plan, or a change to a plan nobody has, can start today.
 * A change is never dated in the past: it only reaches invoices still to be
 * issued. (A plan's first price may be backdated -- see setPlanPrice.)
 *
 * @param {{ today: Date, hasCurrentPrice: boolean, activePlayers: number, noticeDays: number }} input
 */
export function earliestPriceStart({ today, hasCurrentPrice, activePlayers, noticeDays }) {
  return hasCurrentPrice && activePlayers > 0 ? addDays(today, noticeDays) : today;
}

/** A price that has not started yet (valid_from after today). */
export function isScheduled(price, today) {
  return price != null && price.validFrom > today;
}
