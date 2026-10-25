import { isMinorByBirthDate } from '../../domain/policies/age.js';

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
    if (user.birthDate && isMinorByBirthDate(user.birthDate, clock.now())) return { isMinor: true };
    return { isMinor: await guardianshipRepository.existsApprovedAsMinor(userId) };
  };
}
