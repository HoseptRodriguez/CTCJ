/**
 * The one place goals' infrastructure is allowed to know coaching exists,
 * for SKILL_RATING progress. Accepts the already-built use-case function as
 * a dependency, matching competitionProgressProviderAdapter.js's identical
 * pattern.
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
