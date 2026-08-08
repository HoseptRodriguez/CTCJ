/**
 * Goals' own narrow window into competition's standings/win-loss concept,
 * used to compute MATCH_WINS/RANKING_POSITION progress. Own copy, not
 * shared with identity's identically-shaped port (achievements).
 */
export class CompetitionProgressProvider {
  /**
   * @returns {Promise<{hasSeason: boolean, categories: {category: string, modality: string, rank: number|null, wins: number}[]}>}
   */
  async getMySummary(_playerId) {
    throw new Error('Not implemented');
  }
}
