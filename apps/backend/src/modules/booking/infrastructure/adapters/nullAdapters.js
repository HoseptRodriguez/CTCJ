import { DEFAULT_HOLD_DURATION_MINUTES } from '../../domain/policies/bookingPolicy.js';

/**
 * Safe defaults so buildBookingContainer() still works standalone (e.g. in
 * tests) without requiring the cross-module wiring app.js normally supplies.
 * Both fail open to "never blocks" -- consistent with the policy's own
 * documented safe/permissive default.
 */

export function createNullMembershipStatusProvider() {
  return {
    async getStatus() {
      return null;
    },
  };
}

export function createStaticBookingPolicySettings(
  enabled = false,
  holdMinutes = DEFAULT_HOLD_DURATION_MINUTES,
) {
  return {
    async isOverdueBookingBlockEnabled() {
      return enabled;
    },
    async setOverdueBookingBlockEnabled() {
      throw new Error('Static policy adapter is read-only.');
    },
    async getHoldDurationMinutes() {
      return holdMinutes;
    },
    async setHoldDurationMinutes() {
      throw new Error('Static policy adapter is read-only.');
    },
  };
}

/** Never authorizes booking-for-others -- safe default, matches the others' fail-closed-to-self-only stance. */
/** Default when identity isn't wired (tests): no names known. */
export function createNullPlayerDirectoryProvider() {
  return {
    async getPlayerSummaries() {
      return new Map();
    },
  };
}

export function createNullGuardianshipProvider() {
  return {
    async canBookFor() {
      return false;
    },
  };
}
