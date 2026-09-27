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

  /** @returns {Promise<PlanRow|null>} same name ignoring case and surrounding spaces */
  async findByName(_clubId, _name) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<PlanRow[]>} */
  async listByClub(_clubId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<string[]>} every plan code of the club */
  async listCodes(_clubId) {
    throw new Error('Not implemented');
  }

  /**
   * @param {string} _id
   * @param {{ name?: string, description?: string|null, isActive?: boolean }} _changes
   * @returns {Promise<PlanRow>}
   */
  async update(_id, _changes) {
    throw new Error('Not implemented');
  }

  /**
   * The last-added row (validTo === null). It may not have started yet: a
   * price scheduled in advance is the open row while the previous one still
   * applies. Use findPriceAt() for "what does this plan cost on day X".
   * @returns {Promise<PriceRow|null>}
   */
  async findCurrentPrice(_planId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<PriceRow|null>} the price in effect on `date` (validFrom <= date < validTo) */
  async findPriceAt(_planId, _date) {
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

  /**
   * Undoes a price that has not started yet, in one transaction: deletes it
   * and reopens the one it would have replaced (validTo back to null). Safe
   * because no invoice can have used a price that never applied.
   * @param {{ scheduledId: string, previousId: string|null }} _input
   */
  async cancelScheduledPrice(_input) {
    throw new Error('Not implemented');
  }
}
