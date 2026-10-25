export const ADULT_AGE = 18;

/** Age in whole years on `today` (both read as calendar dates, UTC fields). */
export function ageOn(birthDate, today) {
  const b = new Date(birthDate);
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < b.getUTCMonth() ||
    (today.getUTCMonth() === b.getUTCMonth() && today.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Club calendar (UTC-5): is this birth date under 18 at `now`? */
export function isMinorByBirthDate(birthDate, now) {
  const today = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return ageOn(birthDate, today) < ADULT_AGE;
}
