import { CourtNotFound } from '../errors/CourtNotFound.js';

/**
 * A court's price changes (newest first, with who made them) and how many
 * upcoming reservations keep their own price if it changes now -- what the
 * "Precios de canchas" panel shows before and after a change.
 *
 * @param {{
 *   courtRepository: import('../ports/CourtRepository.js').CourtRepository,
 *   reservationRepository: import('../ports/ReservationRepository.js').ReservationRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 * }} deps
 */
export function createGetCourtPriceHistory({
  courtRepository,
  reservationRepository,
  playerDirectoryProvider,
  clock,
  clubId,
}) {
  /** @param {{ courtId: string }} input */
  return async function getCourtPriceHistory({ courtId }) {
    const court = await courtRepository.findActiveById(clubId, courtId);
    if (!court) {
      throw new CourtNotFound();
    }
    const [rows, upcomingReservations] = await Promise.all([
      courtRepository.listPriceHistory(courtId),
      reservationRepository.countUpcomingByCourt(courtId, clock.now()),
    ]);
    const people = await playerDirectoryProvider.getPlayerSummaries([
      ...new Set(rows.map((r) => r.changedBy)),
    ]);
    return {
      courtId,
      priceCop: court.priceCop,
      upcomingReservations,
      history: rows.map((row) => {
        const who = people.get(row.changedBy);
        return { ...row, changedByName: who ? `${who.firstName} ${who.lastName}`.trim() : null };
      }),
    };
  };
}
