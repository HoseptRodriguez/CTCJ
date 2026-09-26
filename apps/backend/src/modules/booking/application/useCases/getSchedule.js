import { resolveClubDayRangeUtc } from '../../domain/policies/scheduleWindow.js';
import { projectForViewer } from '../../domain/services/reservationPrivacy.js';

/**
 * @param {{
 *   reservationRepository: import('../ports/ReservationRepository.js').ReservationRepository,
 *   courtRepository: import('../ports/CourtRepository.js').CourtRepository,
 *   clubId: string,
 *   membershipStatusProvider: import('../ports/MembershipStatusProvider.js').MembershipStatusProvider,
 *   playerDirectoryProvider?: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 * }} deps
 */
export function createGetSchedule({
  reservationRepository,
  courtRepository,
  clubId,
  membershipStatusProvider,
  playerDirectoryProvider,
}) {
  /**
   * @param {{ date: string, viewer: { userId: string|null, isStaff: boolean } }} input
   */
  return async function getSchedule({ date, viewer }) {
    const { dayStart, dayEnd } = resolveClubDayRangeUtc(date);

    const [courts, reservations] = await Promise.all([
      courtRepository.listActive(clubId),
      reservationRepository.listOccupyingByClubAndDateRange(clubId, dayStart, dayEnd),
    ]);

    // Staff-only lookup: one membershipStatusProvider call per unique
    // holder in this day's schedule. Accepted N+1-shaped trade-off at this
    // phase's scale (a handful of courts, one day at a time) -- same spirit
    // as the existing "best-effort courtesy check... judged acceptable"
    // trade-off already in createHold.js. If this ever matters, the fix is
    // a batch method on the port, not a redesign.
    let statusByHolder = new Map();
    let namesById = new Map();
    if (viewer.isStaff) {
      const holderIds = [...new Set(reservations.map((r) => r.holderUserId).filter(Boolean))];
      const entries = await Promise.all(
        holderIds.map(async (id) => [id, await membershipStatusProvider.getStatus(id)]),
      );
      statusByHolder = new Map(entries);
      // Staff-only, additive: the front desk needs to know WHO to charge,
      // and whether someone (e.g. a guardian) booked on the holder's behalf.
      // Staff could already see the holder's id -- this only adds names.
      const peopleIds = [
        ...new Set(reservations.flatMap((r) => [r.holderUserId, r.createdBy]).filter(Boolean)),
      ];
      namesById = playerDirectoryProvider
        ? await playerDirectoryProvider.getPlayerSummaries(peopleIds)
        : new Map();
    }

    const fullName = (id) => {
      const person = namesById.get(id);
      return person ? `${person.firstName} ${person.lastName}`.trim() : null;
    };

    return {
      date,
      courts,
      reservations: reservations.map((reservation) => {
        const projected = projectForViewer(
          reservation,
          viewer,
          statusByHolder.get(reservation.holderUserId) ?? null,
        );
        if (!viewer.isStaff) return projected;
        const bookedByOther =
          reservation.holderUserId != null && reservation.createdBy !== reservation.holderUserId;
        return {
          ...projected,
          holderName: fullName(reservation.holderUserId),
          bookedByOther,
          createdByName: bookedByOther ? fullName(reservation.createdBy) : null,
        };
      }),
    };
  };
}
