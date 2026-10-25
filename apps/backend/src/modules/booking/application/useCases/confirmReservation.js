import { RESERVATION_STATUS } from '@ctcj/shared';

import { ReservationNotFound } from '../errors/ReservationNotFound.js';
import { HoldExpired } from '../../domain/errors/HoldExpired.js';

/**
 * Confirming freezes the price: the court's price per hour in effect now,
 * times the reservation's hours (1, or 2 with the second hour). A later
 * change of the court's price never touches it.
 *
 * @param {{
 *   reservationRepository: import('../ports/ReservationRepository.js').ReservationRepository,
 *   courtRepository?: import('../ports/CourtRepository.js').CourtRepository,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId?: string,
 * }} deps
 */
export function createConfirmReservation({
  reservationRepository,
  courtRepository,
  clock,
  clubId,
}) {
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

    const court = courtRepository
      ? await courtRepository.findActiveById(clubId, reservation.courtId)
      : null;
    const priceCop =
      court?.priceCop != null
        ? BigInt(court.priceCop) * BigInt(reservation.hours())
        : reservation.priceCop;

    const affected = await reservationRepository.transitionStatus({
      id: reservationId,
      fromStatuses: [RESERVATION_STATUS.HOLD],
      toStatus: RESERVATION_STATUS.CONFIRMED,
      extra: { priceCop },
    });
    if (affected === 0) {
      // The row changed underneath us between the read and this write (most
      // likely the expiry job fired first) -- the in-memory check above
      // couldn't have known that.
      throw new HoldExpired();
    }

    return {
      reservationId,
      status: RESERVATION_STATUS.CONFIRMED,
      priceCop,
      hours: reservation.hours(),
    };
  };
}
