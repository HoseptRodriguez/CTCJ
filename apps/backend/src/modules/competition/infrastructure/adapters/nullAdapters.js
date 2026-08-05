/**
 * Safe defaults so buildCompetitionContainer() still works standalone (e.g.
 * in tests) without requiring the cross-module wiring app.js normally
 * supplies. Mirrors coaching's/billing's null-object defaults exactly.
 */
export function createNullPlayerEligibilityProvider() {
  return {
    // Fails closed -- never treats anyone as eligible when the module isn't wired.
    async isEligiblePlayer() {
      return false;
    },
  };
}

export function createNullPlayerDirectoryProvider() {
  return {
    // Fails open (empty map) -- this is display enrichment, not an authz gate.
    async getPlayerSummaries() {
      return new Map();
    },
  };
}
