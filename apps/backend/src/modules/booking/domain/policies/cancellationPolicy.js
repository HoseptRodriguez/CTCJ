/** Cancellation window, ported from v7. Booking computes no money -- it only
 * exposes whether the cancellation happened without penalty as a fact; a
 * future billing module can recompute this later from persisted state
 * (status='CANCELLED', updated_at, period_start) so nothing needs to be
 * emitted or stored beyond the normal status transition. */
export const PENALTY_FREE_WINDOW_HOURS = 12;

const HOUR_MS = 60 * 60_000;

/** @returns {boolean} true if cancelling at `now` incurs no penalty. */
export function isWithoutPenalty(
  periodStart,
  now,
  penaltyFreeWindowHours = PENALTY_FREE_WINDOW_HOURS,
) {
  const hoursUntilStart = (periodStart.getTime() - now.getTime()) / HOUR_MS;
  return hoursUntilStart >= penaltyFreeWindowHours;
}
