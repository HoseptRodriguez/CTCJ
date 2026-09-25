import { CLUB_TIME_ZONE } from './format.js';

/**
 * Club calendar helpers. The club runs on America/Bogota (fixed UTC-5, no
 * DST) -- the same fixed offset apps/backend's scheduleWindow.js uses.
 * Calendar days travel as "YYYY-MM-DD" keys; slot instants as ISO strings.
 */
export const CLUB_UTC_OFFSET_HOURS = 5;

// Real operating hours: first slot 5:00 a. m., last slot starts 9:00 p. m.
export const OPEN_HOUR = 5;
export const CLOSE_HOUR = 22;
export const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);

/** Split of the day so the grid never shows all 17 rows at once. */
export const DAY_PARTS = [
  { value: 'manana', label: 'Mañana', hours: HOURS.filter((h) => h < 12) },
  { value: 'tarde', label: 'Tarde', hours: HOURS.filter((h) => h >= 12 && h < 18) },
  { value: 'noche', label: 'Noche', hours: HOURS.filter((h) => h >= 18) },
];

export function dayPartForHour(hour) {
  return DAY_PARTS.find((part) => part.hours.includes(hour))?.value ?? 'manana';
}

const TODAY_KEY = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLUB_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's date in the club, as "YYYY-MM-DD". */
export function clubTodayKey(now = new Date()) {
  return TODAY_KEY.format(now);
}

/** Current hour (0-23) in the club. */
export function clubCurrentHour(now = new Date()) {
  return (now.getUTCHours() - CLUB_UTC_OFFSET_HOURS + 24) % 24;
}

export function addDaysToKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** The next `count` club days starting today: ["2026-09-25", ...]. */
export function upcomingDayKeys(count, now = new Date()) {
  const today = clubTodayKey(now);
  return Array.from({ length: count }, (_, i) => addDaysToKey(today, i));
}

/** Start instant (ISO) of the one-hour slot at club-local `hour` on `dateKey`. */
export function slotStartIso(dateKey, hour) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, CLUB_UTC_OFFSET_HOURS + hour)).toISOString();
}

export function slotEndIso(dateKey, hour) {
  return new Date(new Date(slotStartIso(dateKey, hour)).getTime() + 60 * 60 * 1000).toISOString();
}

/** A UTC-noon Date for `dateKey`, safe to format in club time without day drift. */
export function dateFromKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}
