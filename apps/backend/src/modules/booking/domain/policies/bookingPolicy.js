import { InvalidTimeSlot } from '../errors/InvalidTimeSlot.js';

/**
 * Reservation creation policy, ported from v7's BookingPolicy defaults, plus
 * one new rule locked by this project (MAX_CONCURRENT_PER_PLAYER -- not in v7).
 */
export const MAX_ADVANCE_DAYS = 7;
export const MIN_ADVANCE_MINUTES = 30;
export const SLOT_DURATION_MINUTES = 60;
export const HOLD_DURATION_MINUTES = 5;
export const MAX_CONCURRENT_PER_PLAYER = 2;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Throws InvalidTimeSlot if the requested [periodStart, periodEnd) slot
 * violates the creation policy. Pure function -- `now` is always injected.
 */
export function validateSlot(periodStart, periodEnd, now) {
  if (!(periodStart instanceof Date) || !(periodEnd instanceof Date)) {
    throw new InvalidTimeSlot('Both start and end must be valid dates.');
  }
  if (periodEnd <= periodStart) {
    throw new InvalidTimeSlot('End must be after start.');
  }

  const durationMinutes = (periodEnd.getTime() - periodStart.getTime()) / MINUTE_MS;
  if (durationMinutes !== SLOT_DURATION_MINUTES) {
    throw new InvalidTimeSlot(
      `Reservations must be exactly ${SLOT_DURATION_MINUTES} minutes long.`,
    );
  }

  const minStart = new Date(now.getTime() + MIN_ADVANCE_MINUTES * MINUTE_MS);
  if (periodStart < minStart) {
    throw new InvalidTimeSlot(
      `Reservations must be made at least ${MIN_ADVANCE_MINUTES} minutes in advance.`,
    );
  }

  const maxStart = new Date(now.getTime() + MAX_ADVANCE_DAYS * DAY_MS);
  if (periodStart > maxStart) {
    throw new InvalidTimeSlot(
      `Reservations cannot be made more than ${MAX_ADVANCE_DAYS} days in advance.`,
    );
  }
}
