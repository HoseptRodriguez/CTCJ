import { UserNotFound } from '../errors/UserNotFound.js';

/**
 * Thin wrapper over the existing UserRepository.findByEmail -- lets staff
 * find a user to act on (e.g. to set their membership status) without a
 * full list-all-users endpoint, which isn't warranted at this scale.
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository, clubId: string }} deps
 */
export function createLookupUserByEmail({ userRepository, clubId }) {
  /**
   * @param {{ email: string }} input
   */
  return async function lookupUserByEmail({ email }) {
    const user = await userRepository.findByEmail(clubId, email);
    if (!user) {
      throw new UserNotFound();
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleCodes: user.listRoleCodes(),
      membershipStatus: user.membershipStatus,
    };
  };
}
