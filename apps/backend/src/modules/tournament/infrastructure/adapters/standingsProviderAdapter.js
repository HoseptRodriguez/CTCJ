/**
 * The one place tournament's infrastructure is allowed to know competition
 * exists. Imports competition's application layer (a plain use-case
 * function), never its persistence -- legal under .dependency-cruiser.js's
 * no-cross-module-persistence and application-no-infra rules, the same
 * adapter shape used for every identity dependency elsewhere in this
 * codebase, just pointed at a non-identity module for the first time.
 *
 * @param {{ getStandings: (input: { seasonId?: string, category: string, modality: string }) => Promise<Array<{playerId: string, points: number}>> }} deps
 * @returns {import('../../application/ports/StandingsProvider.js').StandingsProvider}
 */
export function createCompetitionStandingsProvider({ getStandings }) {
  return {
    async getCurrentStandings({ category, modality }) {
      // seasonId omitted -- competition's own getStandings already defaults
      // to the club's current OPEN season, empty array if none exists.
      const rows = await getStandings({ category, modality });
      return rows.map((row) => ({ playerId: row.playerId, points: row.points }));
    },
  };
}
