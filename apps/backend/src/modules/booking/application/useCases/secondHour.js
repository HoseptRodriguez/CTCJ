import { ReservationNotFound } from '../errors/ReservationNotFound.js';
import { SecondHourDisabled } from '../errors/SecondHourDisabled.js';
import { SecondHourUnavailable } from '../errors/SecondHourUnavailable.js';
import { SlotNotAvailable } from '../errors/SlotNotAvailable.js';
import { HoldExpired } from '../../domain/errors/HoldExpired.js';

/**
 * The optional second hour of a held reservation ("+ Agregar otra hora").
 * It's still ONE reservation: the same hold (its expiry doesn't move), one
 * confirmation, one cancellation, one charge, and it counts once towards
 * the player's limit. The database's exclusion constraint is what decides
 * whether the next hour is still free.
 *
 * The price shown while held is the court's current price per hour times
 * the hours; confirmReservation freezes it again at confirmation.
 *
 * @param {{
 *   reservationRepository: import('../ports/ReservationRepository.js').ReservationRepository,
 *   courtRepository: import('../ports/CourtRepository.js').CourtRepository,
 *   bookingPolicySettings: import('../ports/BookingPolicySettings.js').BookingPolicySettings,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 * }} deps
 */
export function createSecondHourUseCases({
  reservationRepository,
  courtRepository,
  bookingPolicySettings,
  clock,
  clubId,
}) {
  async function load(reservationId, userId, isStaff) {
    const reservation = await reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new ReservationNotFound();
    }
    reservation.ensureOwnedBy(userId, isStaff);
    return reservation;
  }

  async function resize(reservation, periodEnd) {
    const court = await courtRepository.findActiveById(clubId, reservation.courtId);
    const hours = Math.round((periodEnd - reservation.periodStart) / 3_600_000);
    const priceCop = court?.priceCop != null ? BigInt(court.priceCop) * BigInt(hours) : null;
    const saved = await reservationRepository.resizeHold({
      id: reservation.id,
      periodEnd,
      priceCop,
    });
    if (!saved) {
      throw new HoldExpired(); // it stopped being a hold in the meantime (expired or confirmed)
    }
    return {
      reservationId: saved.id,
      periodStart: saved.periodStart,
      periodEnd: saved.periodEnd,
      hours: saved.hours(),
      holdExpiresAt: saved.holdExpiresAt,
      priceCop: saved.priceCop,
    };
  }

  return {
    /** @param {{ reservationId: string, userId: string, isStaff: boolean }} input */
    async addSecondHour({ reservationId, userId, isStaff }) {
      if (!(await bookingPolicySettings.isSecondHourEnabled())) {
        throw new SecondHourDisabled();
      }
      const reservation = await load(reservationId, userId, isStaff);
      const newEnd = reservation.withSecondHour(clock.now()); // HOLD, not expired, 1 hour
      try {
        return await resize(reservation, newEnd);
      } catch (err) {
        if (err instanceof SlotNotAvailable) {
          throw new SecondHourUnavailable(reservation.periodEnd);
        }
        throw err;
      }
    },

    /** @param {{ reservationId: string, userId: string, isStaff: boolean }} input */
    async removeSecondHour({ reservationId, userId, isStaff }) {
      const reservation = await load(reservationId, userId, isStaff);
      return resize(reservation, reservation.withoutSecondHour(clock.now()));
    },
  };
}
