/**
 * Colombian calendar for legal deadlines and messaging hours.
 *
 * Holidays: Ley 51 de 1983 ("Ley Emiliani") moves most of them to the next
 * Monday; Jueves y Viernes Santo and six fixed dates never move. Business
 * days are Monday to Friday, not holidays. All dates here are club
 * calendar dates ("YYYY-MM-DD", Colombia has no DST: UTC-5).
 *
 * [VERIFICAR] in docs/LEGAL_PENDIENTES.md: a lawyer should confirm the
 * holiday rules and whether the day of receipt counts toward a deadline.
 */

const CLUB_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Club calendar date ("YYYY-MM-DD") of an instant. */
export function clubDateOf(instant) {
  return new Date(new Date(instant).getTime() + CLUB_OFFSET_MS).toISOString().slice(0, 10);
}

function toUtcDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function ymdOf(date) {
  return date.toISOString().slice(0, 10);
}

function plusDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Next Monday on or after the date (Ley 51 de 1983). */
function onOrNextMonday(date) {
  const weekday = date.getUTCDay(); // 0 = Sunday
  const shift = (8 - weekday) % 7;
  return plusDays(date, weekday === 1 ? 0 : shift);
}

/** Gregorian Easter Sunday (anonymous algorithm, Meeus/Jones/Butcher). */
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const cache = new Map();

/** The year's holidays as sorted "YYYY-MM-DD" strings. */
export function colombianHolidays(year) {
  if (cache.has(year)) return cache.get(year);
  const fixed = ['01-01', '05-01', '07-20', '08-07', '12-08', '12-25'].map(
    (md) => new Date(`${year}-${md}T00:00:00Z`),
  );
  const movable = ['01-06', '03-19', '06-29', '08-15', '10-12', '11-01', '11-11'].map((md) =>
    onOrNextMonday(new Date(`${year}-${md}T00:00:00Z`)),
  );
  const easter = easterSunday(year);
  const easterBased = [
    plusDays(easter, -3), // Jueves Santo
    plusDays(easter, -2), // Viernes Santo
    onOrNextMonday(plusDays(easter, 39)), // Ascensión del Señor
    onOrNextMonday(plusDays(easter, 60)), // Corpus Christi
    onOrNextMonday(plusDays(easter, 68)), // Sagrado Corazón
  ];
  const list = [...new Set([...fixed, ...movable, ...easterBased].map(ymdOf))].sort();
  cache.set(year, list);
  return list;
}

export function isColombianHoliday(ymd) {
  return colombianHolidays(Number(ymd.slice(0, 4))).includes(ymd);
}

export function isBusinessDay(ymd) {
  const weekday = toUtcDate(ymd).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !isColombianHoliday(ymd);
}

/**
 * The date `n` business days after `ymd` (the starting day itself doesn't
 * count): a request received on a Friday with n = 1 is due on Monday.
 */
export function addBusinessDays(ymd, n) {
  let date = toUtcDate(ymd);
  let left = n;
  while (left > 0) {
    date = plusDays(date, 1);
    if (isBusinessDay(ymdOf(date))) left -= 1;
  }
  return ymdOf(date);
}

/**
 * Business days from `fromYmd` (exclusive) to `toYmd` (inclusive); negative
 * when `toYmd` is earlier. 0 means "due today" when `fromYmd` is today.
 */
export function businessDaysBetween(fromYmd, toYmd) {
  if (fromYmd === toYmd) return 0;
  const forward = fromYmd < toYmd;
  let date = toUtcDate(forward ? fromYmd : toYmd);
  const end = forward ? toYmd : fromYmd;
  let count = 0;
  while (ymdOf(date) < end) {
    date = plusDays(date, 1);
    if (isBusinessDay(ymdOf(date))) count += 1;
  }
  return forward ? count : -count;
}

/**
 * Ley 2300 de 2023, art. 3: promotional messages only Monday to Friday
 * 7:00 a. m. - 7:00 p. m. and Saturdays 8:00 a. m. - 3:00 p. m., never on
 * Sundays or holidays. Service messages (bookings, invoices) are not
 * promotional and aren't limited by this.
 */
export function isWithinMarketingHours(instant) {
  const local = new Date(new Date(instant).getTime() + CLUB_OFFSET_MS);
  const ymd = ymdOf(local);
  const weekday = local.getUTCDay();
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  if (weekday === 0 || isColombianHoliday(ymd)) return false;
  if (weekday === 6) return minutes >= 8 * 60 && minutes < 15 * 60;
  return minutes >= 7 * 60 && minutes < 19 * 60;
}

/** Service messages: any day, 7:00 a. m. to 9:00 p. m. (club time). */
export function isWithinServiceHours(instant) {
  const local = new Date(new Date(instant).getTime() + CLUB_OFFSET_MS);
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  return minutes >= 7 * 60 && minutes < 21 * 60;
}

/** Allowed [start, end) minutes of a club date, or null when none. */
function windowOf(ymd, kind) {
  if (kind === 'SERVICE') return [7 * 60, 21 * 60];
  const weekday = toUtcDate(ymd).getUTCDay();
  if (weekday === 0 || isColombianHoliday(ymd)) return null;
  if (weekday === 6) return [8 * 60, 15 * 60];
  return [7 * 60, 19 * 60];
}

/**
 * The first instant at or after `instant` when a message of this kind may
 * be sent: the same instant if it is inside the allowed hours, otherwise
 * the start of the next allowed window (a promotional message programmed
 * for a Sunday goes out on Monday at 7:00 a. m., or Tuesday if Monday is a
 * holiday).
 *
 * @param {Date|string|number} instant
 * @param {'SERVICE'|'PROMOTIONAL'} kind
 * @returns {Date}
 */
export function nextAllowedSendTime(instant, kind) {
  const at = new Date(instant);
  const inside = kind === 'SERVICE' ? isWithinServiceHours(at) : isWithinMarketingHours(at);
  if (inside) return at;
  let ymd = clubDateOf(at);
  const local = new Date(at.getTime() + CLUB_OFFSET_MS);
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  // Today, if the window hasn't opened yet; otherwise the next days.
  let window = windowOf(ymd, kind);
  if (!window || minutes >= window[0]) {
    let date = toUtcDate(ymd);
    do {
      date = plusDays(date, 1);
      ymd = ymdOf(date);
      window = windowOf(ymd, kind);
    } while (!window);
  }
  return new Date(toUtcDate(ymd).getTime() + window[0] * 60 * 1000 - CLUB_OFFSET_MS);
}
