import { resolveClubDayRangeUtc } from '../../domain/policies/scheduleWindow.js';
import { projectForViewer } from '../../domain/services/reservationPrivacy.js';

/**
 * @param {{
 *   reservationRepository: import('../ports/ReservationRepository.js').ReservationRepository,
 *   courtRepository: import('../ports/CourtRepository.js').CourtRepository,
 *   clubId: string,
 * }} deps
 */
export function createGetSchedule({ reservationRepository, courtRepository, clubId }) {
  /**
   * @param {{ date: string, viewer: { userId: string|null, isStaff: boolean } }} input
   */
  return async function getSchedule({ date, viewer }) {
    const { dayStart, dayEnd } = resolveClubDayRangeUtc(date);

    const [courts, reservations] = await Promise.all([
      courtRepository.listActive(clubId),
      reservationRepository.listOccupyingByClubAndDateRange(clubId, dayStart, dayEnd),
    ]);

    return {
      date,
      courts,
      reservations: reservations.map((reservation) => projectForViewer(reservation, viewer)),
    };
  };
}
