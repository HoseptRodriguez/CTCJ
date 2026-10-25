import { CourtNotFound } from '../errors/CourtNotFound.js';

/**
 * Changes a court's price for NEW reservations. Reservations already made
 * (held or confirmed) keep the price they were made with; the answer says
 * how many there are, for the confirmation message.
 *
 * @param {{
 *   courtRepository: import('../ports/CourtRepository.js').CourtRepository,
 *   reservationRepository: import('../ports/ReservationRepository.js').ReservationRepository,
 *   auditLog: import('../ports/BookingAuditLog.js').BookingAuditLog,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 * }} deps
 */
export function createSetCourtPrice({
  courtRepository,
  reservationRepository,
  auditLog,
  clock,
  clubId,
}) {
  /**
   * @param {{ courtId: string, priceCop: number, actorUserId: string, actorRoles?: string[] }} input
   */
  return async function setCourtPrice({ courtId, priceCop, actorUserId, actorRoles = [] }) {
    const result = await courtRepository.setPrice(clubId, courtId, priceCop, actorUserId);
    if (!result) {
      throw new CourtNotFound();
    }
    const { court, previousPriceCop } = result;
    await auditLog.record({
      actorUserId,
      actorRoles,
      action: 'COURT_PRICE_CHANGED',
      entityType: 'Court',
      entityId: court.id,
      before: { priceCop: previousPriceCop == null ? null : String(previousPriceCop) },
      after: { priceCop: String(court.priceCop) },
    });
    const upcomingReservations = await reservationRepository.countUpcomingByCourt(
      court.id,
      clock.now(),
    );
    return {
      courtId: court.id,
      priceCop: court.priceCop,
      previousPriceCop,
      upcomingReservations,
    };
  };
}
