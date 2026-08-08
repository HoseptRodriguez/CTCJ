/**
 * The one place goals' infrastructure is allowed to know competition
 * exists, for MATCH_WINS/RANKING_POSITION progress. Accepts the already-
 * built use-case function as a dependency (app.js wires
 * `competitionContainer.getMyCompetitionSummary` in directly) -- no file
 * import of competition's source at all, matching every other cross-module
 * adapter in this codebase (e.g. billing's PlayerDirectoryProvider adapter).
 *
 * @param {{ getMyCompetitionSummary: (input: { playerId: string }) => Promise<{hasSeason: boolean, categories: Array}> }} deps
 * @returns {import('../../application/ports/CompetitionProgressProvider.js').CompetitionProgressProvider}
 */
export function createCompetitionProgressProviderAdapter({ getMyCompetitionSummary }) {
  return {
    async getMySummary(playerId) {
      return getMyCompetitionSummary({ playerId });
    },
  };
}
