import { UserNotFound } from '../errors/UserNotFound.js';

/**
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository }} deps
 */
export function createGetMembershipStatus({ userRepository }) {
  /**
   * @param {{ userId: string }} input
   */
  return async function getMembershipStatus({ userId }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UserNotFound();
    }
    return { status: user.membershipStatus };
  };
}
