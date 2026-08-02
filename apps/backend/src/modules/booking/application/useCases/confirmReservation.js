import { RESERVATION_STATUS } from '@ctcj/shared';

import { ReservationNotFound } from '../errors/ReservationNotFound.js';
import { HoldExpired } from '../../domain/errors/HoldExpired.js';

/**
 * @param {{
 *   reservationRepository: import('../ports/ReservationRepository.js').ReservationRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createConfirmReservation({ reservationRepository, clock }) {
  /**
   * @param {{ reservationId: string, userId: string, isStaff: boolean }} input
   */
  return async function confirmReservation({ reservationId, userId, isStaff }) {
    const now = clock.now();

    const reservation = await reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new ReservationNotFound();
    }

    reservation.ensureOwnedBy(userId, isStaff);
    reservation.confirm(now); // in-memory guard: throws InvalidReservationState/HoldExpired

    const affected = await reservationRepository.transitionStatus({
      id: reservationId,
      fromStatuses: [RESERVATION_STATUS.HOLD],
      toStatus: RESERVATION_STATUS.CONFIRMED,
    });
    if (affected === 0) {
      // The row changed underneath us between the read and this write (most
      // likely the expiry job fired first) -- the in-memory check above
      // couldn't have known that.
      throw new HoldExpired();
    }

    return { reservationId, status: RESERVATION_STATUS.CONFIRMED };
  };
}
