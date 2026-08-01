import { RESERVATION_STATUS } from '@ctcj/shared';

import { ReservationNotFound } from '../errors/ReservationNotFound.js';
import { InvalidReservationState } from '../../domain/errors/InvalidReservationState.js';

/**
 * @param {{
 *   reservationRepository: import('../ports/ReservationRepository.js').ReservationRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCancelReservation({ reservationRepository, clock }) {
  /**
   * @param {{ reservationId: string, userId: string, isStaff: boolean }} input
   */
  return async function cancelReservation({ reservationId, userId, isStaff }) {
    const now = clock.now();

    const reservation = await reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new ReservationNotFound();
    }

    reservation.ensureOwnedBy(userId, isStaff);
    const { withoutPenalty } = reservation.cancel(now); // in-memory guard: throws InvalidReservationState

    const affected = await reservationRepository.transitionStatus({
      id: reservationId,
      fromStatuses: [RESERVATION_STATUS.HOLD, RESERVATION_STATUS.CONFIRMED],
      toStatus: RESERVATION_STATUS.CANCELLED,
    });
    if (affected === 0) {
      // Row changed underneath us (e.g. expired, or already cancelled by a
      // concurrent request) between the read and this write.
      throw new InvalidReservationState(reservation.status, 'cancel');
    }

    return { reservationId, status: RESERVATION_STATUS.CANCELLED, withoutPenalty };
  };
}
