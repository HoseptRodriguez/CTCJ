/**
 * @typedef {{
 *   id: string,
 *   userId: string,
 *   status: string,
 *   requestedAt: Date,
 *   decidedAt: Date|null,
 *   decidedBy: string|null,
 *   notes: string|null,
 *   decisionNotes: string|null,
 * }} AffiliationRequestRow
 */

export class AffiliationRequestRepository {
  /** @returns {Promise<AffiliationRequestRow>} */
  async create(_input) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<AffiliationRequestRow|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<AffiliationRequestRow|null>} */
  async findPendingForUser(_userId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<AffiliationRequestRow[]>} */
  async listByUser(_userId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<AffiliationRequestRow[]>} */
  async listByStatus(_status) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<AffiliationRequestRow>} */
  async decide(_id, _status, _decidedAt, _decidedBy, _decisionNotes) {
    throw new Error('Not implemented');
  }
}
