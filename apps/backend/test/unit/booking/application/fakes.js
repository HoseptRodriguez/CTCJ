import { OCCUPYING_STATUSES } from '@ctcj/shared';

import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';
import { SlotNotAvailable } from '../../../../src/modules/booking/application/errors/SlotNotAvailable.js';

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
  };
}

export function createFakeReservationRepository() {
  const byId = new Map();

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
