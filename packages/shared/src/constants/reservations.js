/**
 * Reservation status/type catalog, ported from v7 (V3__booking.sql).
 * Kept as string constants (not a native DB enum) so adding a value never
 * requires a type migration -- see docs/adr/0002-varchar-check-vs-native-enum.md.
 */
export const RESERVATION_STATUS = Object.freeze({
  HOLD: 'HOLD',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  NO_SHOW: 'NO_SHOW',
  COMPLETED: 'COMPLETED',
});

export const RESERVATION_TYPE = Object.freeze({
  PRIVATE: 'PRIVATE',
  CLASS: 'CLASS',
  TOURNAMENT: 'TOURNAMENT',
  MAINTENANCE: 'MAINTENANCE',
  BLOCKED: 'BLOCKED',
});

/** Statuses that occupy a court and participate in the no-overlap guarantee. */
export const OCCUPYING_STATUSES = Object.freeze([
  RESERVATION_STATUS.HOLD,
  RESERVATION_STATUS.CONFIRMED,
]);

/**
 * Minutes a HOLD waits for the player to confirm. The club admin can change
 * it (SystemSetting 'booking.holdDurationMinutes') within this range.
 */
export const DEFAULT_HOLD_DURATION_MINUTES = 15;
export const MIN_HOLD_DURATION_MINUTES = 5;
export const MAX_HOLD_DURATION_MINUTES = 60;
