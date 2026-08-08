/**
 * The one place identity's infrastructure is allowed to know coaching
 * exists, for achievement-badge computation (Phase 2). Accepts the
 * already-built use-case function as a dependency, matching
 * competitionProgressProviderAdapter.js's identical pattern.
 *
 * @param {{ getMyPerformance: (input: { playerId: string }) => Promise<{summary: {latestByArea: Record<string, number>}}> }} deps
 * @returns {import('../../application/ports/PerformanceProgressProvider.js').PerformanceProgressProvider}
 */
export function createPerformanceProgressProviderAdapter({ getMyPerformance }) {
  return {
    async getMyPerformance(playerId) {
      return getMyPerformance({ playerId });
    },
  };
}
