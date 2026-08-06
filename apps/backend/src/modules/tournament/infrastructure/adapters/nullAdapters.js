/**
 * Safe defaults so buildTournamentContainer() still works standalone (e.g.
 * in tests) without requiring the cross-module wiring app.js normally
 * supplies. Mirrors competition's/coaching's null-object defaults exactly.
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

export function createNullStandingsProvider() {
  return {
    // Fails open (empty array) -- seeding gracefully degrades to
    // registration order when no standings data is available.
    async getCurrentStandings() {
      return [];
    },
  };
}
