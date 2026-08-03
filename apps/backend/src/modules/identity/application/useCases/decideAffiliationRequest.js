import { AFFILIATION_REQUEST_STATUS, ROLE_CODES } from '@ctcj/shared';

import { grantRole } from '../../domain/services/grantRole.js';
import { AffiliationRequestNotFound } from '../errors/AffiliationRequestNotFound.js';
import { AffiliationRequestNotPending } from '../errors/AffiliationRequestNotPending.js';
import { UserNotFound } from '../errors/UserNotFound.js';

/**
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   affiliationRequestRepository: import('../ports/AffiliationRequestRepository.js').AffiliationRequestRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createDecideAffiliationRequest({
  userRepository,
  affiliationRequestRepository,
  clock,
}) {
  /**
   * @param {{ requestId: string, decision: 'APPROVED'|'REJECTED', notes?: string, decidedByUserId: string }} input
   */
  return async function decideAffiliationRequest({ requestId, decision, notes, decidedByUserId }) {
    const request = await affiliationRequestRepository.findById(requestId);
    if (!request) {
      throw new AffiliationRequestNotFound();
    }
    if (request.status !== AFFILIATION_REQUEST_STATUS.PENDING) {
      throw new AffiliationRequestNotPending();
    }

    if (decision === AFFILIATION_REQUEST_STATUS.APPROVED) {
      const user = await userRepository.findById(request.userId);
      if (!user) {
        throw new UserNotFound();
      }
      grantRole(user, ROLE_CODES.JUGADOR, /* grantorIsAdmin */ true);
      await userRepository.addRoleGrant(user.id, ROLE_CODES.JUGADOR, decidedByUserId);
    }

    return affiliationRequestRepository.decide(
      requestId,
      decision,
      clock.now(),
      decidedByUserId,
      notes ?? null,
    );
  };
}
