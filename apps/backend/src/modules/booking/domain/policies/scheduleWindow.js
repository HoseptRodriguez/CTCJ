/**
 * CTCJ operates in America/Bogota, which is a fixed UTC-5 offset with no DST
 * -- so a simple fixed-offset calculation is correct and avoids pulling in a
 * timezone-database dependency for one club in one fixed zone.
 */
const CLUB_UTC_OFFSET_HOURS = 5; // local = UTC - 5, so local midnight = 05:00 UTC

const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolves a club-local calendar day (given as "YYYY-MM-DD") to the
 * [dayStart, dayEnd) UTC instant range that covers it.
 */
export function resolveClubDayRangeUtc(dateStr) {
  if (!DATE_STRING_PATTERN.test(dateStr)) {
    throw new Error(`Invalid date string: ${dateStr}. Expected YYYY-MM-DD.`);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const dayStart = new Date(Date.UTC(year, month - 1, day, CLUB_UTC_OFFSET_HOURS, 0, 0, 0));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, dayEnd };
}
