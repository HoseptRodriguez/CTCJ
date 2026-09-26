import { RESERVATION_TYPE } from '@ctcj/shared';

import { HOURS, slotStartIso } from './clubTime.js';

/**
 * Booking rules mirrored from apps/backend (domain/policies/bookingPolicy.js
 * and entities/Reservation.js) so the grid never offers an hour the server
 * would reject. The server stays the only real enforcement.
 */
export const MIN_ADVANCE_MINUTES = 30;
export const MAX_ADVANCE_DAYS = 7;
export const DAYS_SHOWN = MAX_ADVANCE_DAYS + 1; // today + 7

const MINUTE = 60_000;

/**
 * What one hour of one court is, for the person looking at it:
 * - 'free'       bookable now
 * - 'mine'       their own booking (or one they made for a minor)
 * - 'occupied'   someone else's booking (who, is never shown)
 * - 'class' | 'tournament'  institutional use, with its label
 * - 'blocked'    maintenance or closed
 * - 'unavailable' free, but outside the 30-min..7-day window (or past)
 */
export function classifySlot(reservation, startIso, now = new Date()) {
  if (reservation) {
    if ('reservationType' in reservation) {
      if (reservation.reservationType === RESERVATION_TYPE.CLASS) return 'class';
      if (reservation.reservationType === RESERVATION_TYPE.TOURNAMENT) return 'tournament';
      if (
        reservation.reservationType === RESERVATION_TYPE.MAINTENANCE ||
        reservation.reservationType === RESERVATION_TYPE.BLOCKED
      ) {
        return 'blocked';
      }
      return reservation.isOwnBooking ? 'mine' : 'occupied';
    }
    if (reservation.label === 'Clase') return 'class';
    if (reservation.label === 'Torneo') return 'tournament';
    return 'occupied';
  }
  const start = new Date(startIso).getTime();
  if (start < now.getTime() + MIN_ADVANCE_MINUTES * MINUTE) return 'unavailable';
  if (start > now.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * MINUTE) return 'unavailable';
  return 'free';
}

/** The reservation (if any) covering the slot starting at `startIso` on `courtId`. */
export function findReservation(reservations, courtId, startIso) {
  const start = new Date(startIso).getTime();
  return (
    reservations.find(
      (r) =>
        r.courtId === courtId &&
        new Date(r.periodStart).getTime() <= start &&
        new Date(r.periodEnd).getTime() > start,
    ) ?? null
  );
}

/**
 * Next free hours per court for one day's schedule (the home "Libre hoy"
 * card). `limit` hours per court, in order.
 * @returns {{ court: object, hours: number[] }[]}
 */
export function freeHoursByCourt(schedule, dateKey, { now = new Date(), limit = 3 } = {}) {
  return schedule.courts.map((court) => ({
    court,
    hours: HOURS.filter((hour) => {
      const start = slotStartIso(dateKey, hour);
      return (
        classifySlot(findReservation(schedule.reservations, court.id, start), start, now) === 'free'
      );
    }).slice(0, limit),
  }));
}

/** Seconds left until `expiresAt` (never negative). */
export function secondsUntil(expiresAt, now = Date.now()) {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000));
}

/** 272 -> "4:32". */
export function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// Court time never charged at the desk: the club's own blocks, and classes
// (those are paid in the academy's monthly fee, not per hour).
const NOT_CHARGED = [
  RESERVATION_TYPE.MAINTENANCE,
  RESERVATION_TYPE.BLOCKED,
  RESERVATION_TYPE.CLASS,
];

/** A confirmed booking the front desk charges for (not maintenance, blocks or classes). */
export function isChargeable(r) {
  return r.status === 'CONFIRMED' && !NOT_CHARGED.includes(r.reservationType);
}

/** Chargeable and not paid yet: what "Cobros" and its amber counter count. */
export function isUnpaid(r) {
  return isChargeable(r) && r.paymentId == null;
}
