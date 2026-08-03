import { GUARDIANSHIP_STATUS, ROLE_CODES } from '@ctcj/shared';

import { grantRole } from '../../domain/services/grantRole.js';
import { GuardianshipNotFound } from '../errors/GuardianshipNotFound.js';
import { GuardianshipNotPending } from '../errors/GuardianshipNotPending.js';
import { UserNotFound } from '../errors/UserNotFound.js';

/**
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   guardianshipRepository: import('../ports/GuardianshipRepository.js').GuardianshipRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createDecideGuardianship({ userRepository, guardianshipRepository, clock }) {
  /**
   * @param {{ guardianshipId: string, decision: 'APPROVED'|'REJECTED', notes?: string, decidedByUserId: string }} input
   */
  return async function decideGuardianship({ guardianshipId, decision, notes, decidedByUserId }) {
    const guardianship = await guardianshipRepository.findById(guardianshipId);
    if (!guardianship) {
      throw new GuardianshipNotFound();
    }
    if (guardianship.status !== GUARDIANSHIP_STATUS.PENDING) {
      throw new GuardianshipNotPending();
    }

    if (decision === GUARDIANSHIP_STATUS.APPROVED) {
      const guardian = await userRepository.findById(guardianship.guardianUserId);
      if (!guardian) {
        throw new UserNotFound();
      }
      grantRole(guardian, ROLE_CODES.PADRE_TUTOR, /* grantorIsAdmin */ true);
      await userRepository.addRoleGrant(guardian.id, ROLE_CODES.PADRE_TUTOR, decidedByUserId);
    }

    return guardianshipRepository.decide(
      guardianshipId,
      decision,
      clock.now(),
      decidedByUserId,
      notes ?? null,
    );
  };
}
