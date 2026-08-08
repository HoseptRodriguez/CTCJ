/**
 * Safe default so buildCoachingContainer() still works standalone (e.g. in
 * tests) without requiring the cross-module wiring app.js normally supplies.
 * Fails closed -- never treats anyone as eligible when the module isn't wired.
 */
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
