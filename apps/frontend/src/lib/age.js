/** Whole years on the club's current date (UTC-5) for a YYYY-MM-DD birth date. */
export function ageFromBirthDate(birthDateKey, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateKey ?? '')) return null;
  const [y, m, d] = birthDateKey.split('-').map(Number);
  const today = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d)) {
    age -= 1;
  }
  return age;
}

export const isMinorBirthDate = (key, now) => {
  const age = ageFromBirthDate(key, now);
  return age != null && age < 18;
};
