/**
 * Goals' own narrow window into coaching's skill-rating concept, used to
 * compute SKILL_RATING progress. Own copy, not shared with identity's
 * identically-shaped port (achievements).
 */
export class PerformanceProgressProvider {
  /**
   * @returns {Promise<{summary: {latestByArea: Record<string, number>}}>}
   */
  async getMyPerformance(_playerId) {
    throw new Error('Not implemented');
  }
}
