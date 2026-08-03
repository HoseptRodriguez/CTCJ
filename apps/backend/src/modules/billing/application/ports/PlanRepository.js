/**
 * @typedef {{ id: string, clubId: string, code: string, name: string, description: string|null, isActive: boolean, createdAt: Date }} PlanRow
 * @typedef {{ id: string, planId: string, basePriceCop: bigint, validFrom: Date, validTo: Date|null, createdBy: string, createdAt: Date }} PriceRow
 */

export class PlanRepository {
  /** @returns {Promise<PlanRow>} */
  async create(_input) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<PlanRow|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<PlanRow|null>} */
  async findByCode(_clubId, _code) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<PlanRow[]>} */
  async listByClub(_clubId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<PriceRow|null>} the vigente (validTo === null) row, if any */
  async findCurrentPrice(_planId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<PriceRow[]>} full history, newest first */
  async listPrices(_planId) {
    throw new Error('Not implemented');
  }

  /**
   * Persists supersedePrice()'s two halves in one transaction.
   * @param {string} planId
   * @param {{ closePrevious: {id: string, validTo: Date}|null, newRow: {basePriceCop: bigint|number, validFrom: Date}, createdBy: string }} input
   * @returns {Promise<PriceRow>} the newly-inserted vigente row
   */
  async supersedePrice(_planId, _input) {
    throw new Error('Not implemented');
  }
}
