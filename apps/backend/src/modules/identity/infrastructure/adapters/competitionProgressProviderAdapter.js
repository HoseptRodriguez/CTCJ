/**
 * The one place identity's infrastructure is allowed to know competition
 * exists, for achievement-badge computation (Phase 2). Accepts the
 * already-built use-case function as a dependency (app.js wires
 * `competitionContainer.getMyCompetitionSummary` in directly) -- no file
 * import of competition's source at all, matching billing's/coaching's
 * identical cross-module adapter pattern for PlayerDirectoryProvider.
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
