const ADULT_AGE = 18;

/** Age in whole years on `today` (club calendar). */
function ageOn(birthDate, today) {
  const b = new Date(birthDate);
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < b.getUTCMonth() ||
    (today.getUTCMonth() === b.getUTCMonth() && today.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * Is this the account of a minor? Yes when their birth date says they are
 * under 18, or when they are the minor in an approved guardianship (a
 * guardian answers for them). Used to keep minors from uploading photos or
 * videos. Fails closed: an unknown user counts as a minor.
 *
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   guardianshipRepository: import('../ports/GuardianshipRepository.js').GuardianshipRepository,
 *   clock?: { now: () => Date },
 * }} deps
 */
export function createCheckIsMinor({
  userRepository,
  guardianshipRepository,
  clock = { now: () => new Date() },
}) {
  /** @param {{ userId: string }} input */
  return async function checkIsMinor({ userId }) {
    const user = await userRepository.findById(userId);
    if (!user) return { isMinor: true };
    // Club calendar: UTC-5.
    const today = new Date(clock.now().getTime() - 5 * 60 * 60 * 1000);
    if (user.birthDate && ageOn(user.birthDate, today) < ADULT_AGE) return { isMinor: true };
    return { isMinor: await guardianshipRepository.existsApprovedAsMinor(userId) };
  };
}
