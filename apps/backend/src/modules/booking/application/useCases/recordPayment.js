import { randomUUID } from 'node:crypto';

import { ReservationNotFound } from '../errors/ReservationNotFound.js';
import { ReservationAlreadyPaid } from '../../domain/errors/ReservationAlreadyPaid.js';
import { PaymentConflict } from '../errors/PaymentConflict.js';

/**
 * @param {{
 *   reservationRepository: import('../ports/ReservationRepository.js').ReservationRepository,
 *   paymentRepository: import('../ports/PaymentRepository.js').PaymentRepository,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 * }} deps
 */
export function createRecordPayment({ reservationRepository, paymentRepository, clock, clubId }) {
  /**
   * @param {{ reservationId: string, method: string, notes?: string|null, recordedBy: string }} input
   */
  return async function recordPayment({ reservationId, method, notes = null, recordedBy }) {
    const now = clock.now();

    const reservation = await reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new ReservationNotFound();
    }

    reservation.assertPayable(); // in-memory guard: throws InvalidReservationState/ReservationHasNoPrice/ReservationAlreadyPaid

    try {
      const payment = await paymentRepository.record({
        id: randomUUID(),
        clubId,
        reservationId,
        amountCop: reservation.priceCop,
        method,
        recordedBy,
        notes,
        now,
      });

      return {
        paymentId: payment.id,
        reservationId,
        amountCop: payment.amountCop,
        method: payment.method,
        recordedAt: payment.recordedAt,
      };
    } catch (err) {
      if (err instanceof PaymentConflict) {
        // Lost the race between our read above and the write -- someone
        // else recorded the payment (or changed the reservation's status)
        // in between. Surface the real domain error, not the internal one.
        throw new ReservationAlreadyPaid();
      }
      throw err;
    }
  };
}
