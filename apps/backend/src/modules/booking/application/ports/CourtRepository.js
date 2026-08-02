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

  /** @returns {Promise<CourtSummary|null>} null if no active court matches. */
  async setPrice(_clubId, _courtId, _priceCop) {
    throw new Error('Not implemented');
  }
}
