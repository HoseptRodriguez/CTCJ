/**
 * Safe defaults so buildChallengesContainer() still works standalone (e.g.
 * in tests) without requiring the cross-module wiring app.js normally
 * supplies.
 */

/** Fails closed -- never treats anyone as eligible when the module isn't wired. */
export function createNullPlayerEligibilityProvider() {
  return {
    async isEligiblePlayer() {
      return false;
    },
  };
}

/** Fails open (empty map) -- this is display enrichment, not an authz gate. */
export function createNullPlayerDirectoryProvider() {
  return {
    async getPlayerSummaries() {
      return new Map();
    },
  };
}

/** Fails open (silent no-op) -- a missing notification sender shouldn't
 * block the underlying challenge action from succeeding. */
export function createNullNotificationSender() {
  return {
    async notify() {},
  };
}

/** Fails LOUD, unlike every other port here -- see MatchRecorder.js's
 * own docstring for why a silent no-op would be unsafe for this one. */
export function createNullMatchRecorder() {
  return {
    async recordConfirmedMatch() {
      throw new Error('MatchRecorder not configured');
    },
  };
}
