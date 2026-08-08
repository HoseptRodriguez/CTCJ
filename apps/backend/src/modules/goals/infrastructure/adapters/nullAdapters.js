/**
 * Safe defaults so buildGoalsContainer() still works standalone (e.g. in
 * tests) without requiring the cross-module wiring app.js normally
 * supplies. Fail open (no data) -- these back progress display, not an
 * authz gate.
 */
export function createNullCompetitionProgressProvider() {
  return {
    async getMySummary() {
      return { hasSeason: false, categories: [], recentMatches: [] };
    },
  };
}

export function createNullPerformanceProgressProvider() {
  return {
    async getMyPerformance() {
      return { ratings: [], summary: { ratedAreas: [], latestByArea: {}, progressByArea: {} } };
    },
  };
}

export function createNullTrainingFrequencyProvider() {
  return {
    async getMyTrainingFrequency() {
      return { count: 0 };
    },
  };
}
