import { UserNotFound } from '../errors/UserNotFound.js';
import { GuardianshipSelfLinkForbidden } from '../errors/GuardianshipSelfLinkForbidden.js';
import { GuardianshipAlreadyExists } from '../errors/GuardianshipAlreadyExists.js';

/**
 * Looks up the minor by email via the same repository method the admin
 * lookup uses (Phase 5's lookupUserByEmail.js). This does let any
 * authenticated user learn whether an email belongs to a registered
 * account (UserNotFound vs. success) -- not a new class of exposure, since
 * public unregistered registration already reveals the identical signal via
 * email_already_registered with zero login required.
 *
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   guardianshipRepository: import('../ports/GuardianshipRepository.js').GuardianshipRepository,
 *   clubId: string,
 * }} deps
 */
export function createRequestGuardianship({ userRepository, guardianshipRepository, clubId }) {
  /**
   * @param {{ guardianUserId: string, minorEmail: string, canPay: boolean, canBook: boolean }} input
   */
  return async function requestGuardianship({ guardianUserId, minorEmail, canPay, canBook }) {
    const minor = await userRepository.findByEmail(clubId, minorEmail);
    if (!minor) {
      throw new UserNotFound();
    }
    if (minor.id === guardianUserId) {
      throw new GuardianshipSelfLinkForbidden();
    }

    const existing = await guardianshipRepository.findActiveForPair(guardianUserId, minor.id);
    if (existing) {
      throw new GuardianshipAlreadyExists();
    }

    return guardianshipRepository.create({
      guardianUserId,
      minorUserId: minor.id,
      canPay,
      canBook,
    });
  };
}
