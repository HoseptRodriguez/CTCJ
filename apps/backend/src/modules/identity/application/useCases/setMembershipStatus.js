import { UserNotFound } from '../errors/UserNotFound.js';

/**
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createSetMembershipStatus({ userRepository, clock }) {
  /**
   * @param {{ targetUserId: string, status: string|null, updatedByUserId: string }} input
   */
  return async function setMembershipStatus({ targetUserId, status, updatedByUserId }) {
    const user = await userRepository.findById(targetUserId);
    if (!user) {
      throw new UserNotFound();
    }

    user.setMembershipStatus(status, updatedByUserId, clock.now()); // throws MembershipNotApplicable

    await userRepository.update(user);

    return { userId: user.id, membershipStatus: user.membershipStatus };
  };
}
