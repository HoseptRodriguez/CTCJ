/**
 * Account lockout policy, ported verbatim from v7's AccountLockoutPolicy.
 * Locks after MAX_ATTEMPTS_BEFORE_LOCK failures; duration grows quadratically
 * past the threshold, capped at MAX_LOCK_DURATION_MS.
 */
export const MAX_ATTEMPTS_BEFORE_LOCK = 5;
export const BASE_LOCK_DURATION_MS = 60_000; // 1 minute
export const MAX_LOCK_DURATION_MS = 60 * 60_000; // 1 hour

export function shouldLock(failedAttempts) {
  return failedAttempts >= MAX_ATTEMPTS_BEFORE_LOCK;
}

/** Duration in ms the account should stay locked, given the current failed-attempt count. */
export function computeLockoutDurationMs(failedAttempts) {
  if (!shouldLock(failedAttempts)) {
    return 0;
  }
  const over = Math.max(1, failedAttempts - MAX_ATTEMPTS_BEFORE_LOCK + 1);
  const duration = BASE_LOCK_DURATION_MS * over ** 2;
  return Math.min(duration, MAX_LOCK_DURATION_MS);
}

/** Returns the `lockedUntil` Date for a failed attempt at `now`, or null if not locked. */
export function computeLockedUntil(failedAttempts, now) {
  const durationMs = computeLockoutDurationMs(failedAttempts);
  if (durationMs <= 0) {
    return null;
  }
  return new Date(now.getTime() + durationMs);
}
