import { randomUUID } from 'node:crypto';

import { BOOKING_BLOCKED_MEMBERSHIP_STATUSES } from '@ctcj/shared';

import { validateSlot, MAX_CONCURRENT_PER_PLAYER } from '../../domain/policies/bookingPolicy.js';
import { Reservation } from '../../domain/entities/Reservation.js';
import { CourtNotFound } from '../errors/CourtNotFound.js';
import { MaxConcurrentReservationsExceeded } from '../errors/MaxConcurrentReservationsExceeded.js';
import { MembershipOverdueBookingBlocked } from '../errors/MembershipOverdueBookingBlocked.js';

/**
 * @param {{
 *   reservationRepository: import('../ports/ReservationRepository.js').ReservationRepository,
 *   courtRepository: import('../ports/CourtRepository.js').CourtRepository,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 *   membershipStatusProvider: import('../ports/MembershipStatusProvider.js').MembershipStatusProvider,
 *   bookingPolicySettings: import('../ports/BookingPolicySettings.js').BookingPolicySettings,
 * }} deps
 */
export function createCreateHold({
  reservationRepository,
  courtRepository,
  clock,
  clubId,
  membershipStatusProvider,
  bookingPolicySettings,
}) {
  /**
   * @param {{ courtId: string, periodStart: Date, periodEnd: Date, holderUserId: string }} input
   */
  return async function createHold({ courtId, periodStart, periodEnd, holderUserId }) {
    const now = clock.now();

    validateSlot(periodStart, periodEnd, now); // throws InvalidTimeSlot

    const court = await courtRepository.findActiveById(clubId, courtId);
    if (!court) {
      throw new CourtNotFound();
    }

    const concurrentCount = await reservationRepository.countOccupyingByHolder(holderUserId);
    if (concurrentCount >= MAX_CONCURRENT_PER_PLAYER) {
      throw new MaxConcurrentReservationsExceeded();
    }

    // Checked first so the cross-module membership lookup only ever runs
    // when the club has actually opted in -- zero added cost by default.
    if (await bookingPolicySettings.isOverdueBookingBlockEnabled()) {
      const status = await membershipStatusProvider.getStatus(holderUserId);
      if (BOOKING_BLOCKED_MEMBERSHIP_STATUSES.includes(status)) {
        throw new MembershipOverdueBookingBlocked();
      }
    }

    const reservation = Reservation.createHold({
      id: randomUUID(),
      clubId,
      courtId: court.id,
      periodStart,
      periodEnd,
      holderUserId,
      createdBy: holderUserId,
      priceCop: court.priceCop,
      now,
    });

    // Insert is optimistic: the DB exclusion constraint is the authoritative
    // double-booking guard, and the repository translates a violation into
    // SlotNotAvailable. The concurrent-reservations count above is a
    // best-effort courtesy check with a narrow TOCTOU window under
    // same-player concurrency -- see docs/adr and the Phase 2 plan for why
    // that's judged acceptable rather than a correctness gap.
    const saved = await reservationRepository.createHold(reservation);

    return {
      reservationId: saved.id,
      holdExpiresAt: saved.holdExpiresAt,
      priceCop: saved.priceCop,
    };
  };
}
