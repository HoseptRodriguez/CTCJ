/**
 * @typedef {{ id: string, playerId: string, coachId: string, area: string, rating: number, recordedAt: Date }} PerformanceRatingRow
 */

export class PerformanceRatingRepository {
  /**
   * Persists one row per area in `ratings`, all sharing one recordedAt
   * instant (issued as a single statement/transaction so Postgres's
   * transaction-time-stable CURRENT_TIMESTAMP gives every row the same
   * timestamp for free -- no timestamp manufactured in application code).
   * @param {{ playerId: string, coachId: string, ratings: Record<string, number> }} input
   * @returns {Promise<PerformanceRatingRow[]>}
   */
  async createBatch(_input) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<PerformanceRatingRow[]>} full history for this player, every area, newest first */
  async listByPlayer(_playerId) {
    throw new Error('Not implemented');
  }
}
