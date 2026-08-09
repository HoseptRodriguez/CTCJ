/**
 * Safe defaults so buildCommunityContainer() still works standalone (e.g.
 * in tests) without requiring the cross-module wiring app.js normally
 * supplies. Matches challenges'/goals' identical nullAdapters.js shape.
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
 * block the underlying action from succeeding. */
export function createNullNotificationSender() {
  return {
    async notify() {},
  };
}
