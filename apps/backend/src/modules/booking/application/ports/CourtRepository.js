/**
 * @typedef {{ id: string, name: string, surface: string, hasLighting: boolean, priceCop: bigint|null }} CourtSummary
 */

export class CourtRepository {
  /** @returns {Promise<CourtSummary[]>} */
  async listActive(_clubId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<CourtSummary|null>} */
  async findActiveById(_clubId, _courtId) {
    throw new Error('Not implemented');
  }

  /**
   * Sets the price and records the change in court_price_history, in one
   * transaction. Only new reservations use it: each reservation keeps the
   * price it was made with.
   * @param {string} _clubId @param {string} _courtId @param {number} _priceCop
   * @param {string} _changedBy
   * @returns {Promise<{ court: CourtSummary, previousPriceCop: bigint|null }|null>} null if no active court matches.
   */
  async setPrice(_clubId, _courtId, _priceCop, _changedBy) {
    throw new Error('Not implemented');
  }

  /**
   * @returns {Promise<{ id: string, previousPriceCop: bigint|null, newPriceCop: bigint,
   *   changedBy: string, changedAt: Date }[]>} newest first
   */
  async listPriceHistory(_courtId) {
    throw new Error('Not implemented');
  }
}
