/**
 * Tournament's own narrow window into competition's live standings, used
 * only for seeding a bracket by current ranking. The first module-to-module
 * port in this codebase that isn't module-to-identity -- own copy, wired
 * only in app.js, the concrete adapter is the only place tournament's
 * infrastructure is allowed to know competition exists.
 */
export class StandingsProvider {
  /**
   * @param {{ category: string, modality: string }} input
   * @returns {Promise<Array<{ playerId: string, points: number }>>} the
   *   current OPEN season's standings for this (category, modality), or an
   *   empty array if no OPEN season exists -- callers must gracefully
   *   degrade seeding when this is empty, not treat it as an error.
   */
  async getCurrentStandings(_input) {
    throw new Error('Not implemented');
  }
}
