import { ROLE_CODES } from '@ctcj/shared';

import { UserNotFound } from '../errors/UserNotFound.js';
import { AlreadyJugador } from '../errors/AlreadyJugador.js';
import { AffiliationRequestAlreadyPending } from '../errors/AffiliationRequestAlreadyPending.js';

/**
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   affiliationRequestRepository: import('../ports/AffiliationRequestRepository.js').AffiliationRequestRepository,
 * }} deps
 */
export function createRequestAffiliation({ userRepository, affiliationRequestRepository }) {
  /**
   * @param {{ userId: string, notes?: string }} input
   */
  return async function requestAffiliation({ userId, notes }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UserNotFound();
    }
    if (user.hasRole(ROLE_CODES.JUGADOR)) {
      throw new AlreadyJugador();
    }

    const pending = await affiliationRequestRepository.findPendingForUser(userId);
    if (pending) {
      throw new AffiliationRequestAlreadyPending();
    }

    return affiliationRequestRepository.create({ userId, notes: notes ?? null });
  };
}
