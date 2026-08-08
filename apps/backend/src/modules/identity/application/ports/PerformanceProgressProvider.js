/**
 * Identity's own narrow window into coaching's skill-rating concept, used
 * to compute achievement badges (Phase 2). Own copy, not shared with the
 * goals module's identically-shaped port.
 */
export class PerformanceProgressProvider {
  /**
   * @returns {Promise<{summary: {latestByArea: Record<string, number>}}>}
   */
  async getMyPerformance(_playerId) {
    throw new Error('Not implemented');
  }
}
