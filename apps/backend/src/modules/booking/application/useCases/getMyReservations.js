import {
  getClubLocalDateKey,
  resolveClubDayRangeUtc,
} from '../../domain/policies/scheduleWindow.js';

export const MY_RESERVATIONS_DAYS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Self-service: the caller's own upcoming occupying reservations (HOLD or
 * CONFIRMED) from the start of today, club time, for the next 8 days --
 * where they are the holder or made the booking (e.g. for a minor). Replaces
 * the client asking /schedule once per day and filtering locally.
 *
 * The caller always owns what's returned, so every row carries the full
 * owner view (same fields reservationPrivacy.js gives an owner), plus the
 * court name and whether it was booked for someone else.
 *
 * @param {{
 *   reservationRepository: import('../ports/ReservationRepository.js').ReservationRepository,
 *   courtRepository: import('../ports/CourtRepository.js').CourtRepository,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 * }} deps
 */
export function createGetMyReservations({ reservationRepository, courtRepository, clock, clubId }) {
  /** @param {{ userId: string }} input */
  return async function getMyReservations({ userId }) {
    const { dayStart: from } = resolveClubDayRangeUtc(getClubLocalDateKey(clock.now()));
    const to = new Date(from.getTime() + MY_RESERVATIONS_DAYS * DAY_MS);

    const [reservations, courts] = await Promise.all([
      reservationRepository.listOccupyingByParticipantAndDateRange(userId, from, to),
      courtRepository.listActive(clubId),
    ]);
    const courtNames = new Map(courts.map((court) => [court.id, court.name]));

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      reservations: reservations.map((r) => ({
        id: r.id,
        courtId: r.courtId,
        courtName: courtNames.get(r.courtId) ?? null,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        status: r.status,
        reservationType: r.reservationType,
        holderUserId: r.holderUserId,
        priceCop: r.priceCop,
        paymentId: r.paymentId,
        holdExpiresAt: r.holdExpiresAt,
        isOwnBooking: true,
        bookedForOther: r.holderUserId !== userId,
      })),
    };
  };
}
