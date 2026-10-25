// The club is in America/Bogota: UTC-5 all year, no daylight saving.
const OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The instant the current club day started (00:00 in Fusagasugá). */
export function startOfClubDay(now) {
  const local = now.getTime() - OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS + OFFSET_MS);
}
