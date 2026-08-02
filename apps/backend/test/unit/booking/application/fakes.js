import { OCCUPYING_STATUSES, RESERVATION_STATUS } from '@ctcj/shared';

import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';
import { SlotNotAvailable } from '../../../../src/modules/booking/application/errors/SlotNotAvailable.js';
import { PaymentConflict } from '../../../../src/modules/booking/application/errors/PaymentConflict.js';

function periodsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Real repositories reconstruct a fresh entity from a DB row on every read,
 * so an in-memory domain mutation (e.g. `reservation.confirm()`) never
 * affects what's persisted until an explicit write. This fake must clone on
 * every read for the same reason -- otherwise a use case's in-memory
 * mutation would leak directly into "persisted" state, defeating the
 * atomic-transition guard's whole purpose (detecting a row that changed
 * underneath the call).
 */
function cloneReservation(reservation) {
  return new Reservation({ ...reservation });
}

export function createFakeCourtRepository(courts = []) {
  const byId = new Map(courts.map((c) => [c.id, c]));
  return {
    async listActive(_clubId) {
      return Array.from(byId.values()).filter((c) => c.isActive !== false);
    },
    async findActiveById(_clubId, courtId) {
      const court = byId.get(courtId);
      return court && court.isActive !== false ? court : null;
    },
    async setPrice(_clubId, courtId, priceCop) {
      const court = byId.get(courtId);
      if (!court || court.isActive === false) return null;
      const updated = { ...court, priceCop: BigInt(priceCop) };
      byId.set(courtId, updated);
      return updated;
    },
  };
}

/**
 * Accepts an optional externally-owned backing Map so a
 * createFakePaymentRepository built on the same Map can coordinate with it
 * the way the real Prisma repository coordinates across the `reservations`
 * and `payments` tables inside one transaction (see recordPayment.test.js).
 */
export function createFakeReservationRepository(byId = new Map()) {
  return {
    async createHold(reservation) {
      const conflict = Array.from(byId.values()).some(
        (existing) =>
          existing.courtId === reservation.courtId &&
          OCCUPYING_STATUSES.includes(existing.status) &&
          periodsOverlap(
            existing.periodStart,
            existing.periodEnd,
            reservation.periodStart,
            reservation.periodEnd,
          ),
      );
      if (conflict) {
        throw new SlotNotAvailable();
      }
      byId.set(reservation.id, reservation);
      return reservation;
    },
    async findById(id) {
      const reservation = byId.get(id);
      return reservation ? cloneReservation(reservation) : null;
    },
    async listOccupyingByClubAndDateRange(clubId, dayStart, dayEnd) {
      return Array.from(byId.values())
        .filter(
          (r) =>
            r.clubId === clubId &&
            OCCUPYING_STATUSES.includes(r.status) &&
            periodsOverlap(r.periodStart, r.periodEnd, dayStart, dayEnd),
        )
        .map(cloneReservation);
    },
    async countOccupyingByHolder(holderUserId) {
      return Array.from(byId.values()).filter(
        (r) => r.holderUserId === holderUserId && OCCUPYING_STATUSES.includes(r.status),
      ).length;
    },
    async transitionStatus({ id, fromStatuses, toStatus, extra = {} }) {
      const reservation = byId.get(id);
      if (!reservation || !fromStatuses.includes(reservation.status)) {
        return 0;
      }
      reservation.status = toStatus;
      Object.assign(reservation, extra);
      return 1;
    },
  };
}

/**
 * `reservationsById` must be the same Map passed to
 * createFakeReservationRepository() so the two coordinate the way the real
 * Prisma repository does inside one $transaction.
 */
export function createFakePaymentRepository(reservationsById) {
  const paymentsById = new Map();

  return {
    async record({ id, clubId, reservationId, amountCop, method, recordedBy, notes, now }) {
      const reservation = reservationsById.get(reservationId);
      const stillPayable =
        reservation &&
        reservation.status === RESERVATION_STATUS.CONFIRMED &&
        reservation.paymentId == null;
      if (!stillPayable) {
        throw new PaymentConflict();
      }

      const payment = {
        id,
        clubId,
        amountCop: BigInt(amountCop),
        method,
        recordedBy,
        notes,
        recordedAt: now,
        createdAt: now,
      };
      paymentsById.set(id, payment);
      reservation.paymentId = id;
      return payment;
    },
  };
}

/** @param {Record<string, string|null>} statusByUserId */
export function createFakeMembershipStatusProvider(statusByUserId = {}) {
  return {
    async getStatus(userId) {
      return statusByUserId[userId] ?? null;
    },
  };
}

export function createFakeBookingPolicySettings(enabled = false) {
  let current = enabled;
  return {
    async isOverdueBookingBlockEnabled() {
      return current;
    },
    async setOverdueBookingBlockEnabled(next) {
      current = next;
    },
  };
}

export function createFakeClock(initial) {
  let current = initial;
  return {
    now: () => current,
    set: (date) => {
      current = date;
    },
    advanceMs: (ms) => {
      current = new Date(current.getTime() + ms);
    },
  };
}
