/**
 * Identity's own narrow window into competition's standings/win-loss
 * concept, used to compute achievement badges (Phase 2). Own copy, not
 * shared with the goals module's identically-shaped port.
 */
export class CompetitionProgressProvider {
  /**
   * @returns {Promise<{hasSeason: boolean, categories: {category: string, modality: string, rank: number|null, wins: number}[]}>}
   */
  async getMySummary(_playerId) {
    throw new Error('Not implemented');
  }
}
