/**
 * @typedef {{
 *   id: string,
 *   guardianUserId: string,
 *   minorUserId: string,
 *   canPay: boolean,
 *   canBook: boolean,
 *   status: string,
 *   requestedAt: Date,
 *   decidedAt: Date|null,
 *   decidedBy: string|null,
 *   decisionNotes: string|null,
 * }} GuardianshipRow
 */

export class GuardianshipRepository {
  /** @returns {Promise<GuardianshipRow>} */
  async create(_input) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<GuardianshipRow|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<GuardianshipRow|null>} A PENDING-or-APPROVED row for this pair, if any. */
  async findActiveForPair(_guardianUserId, _minorUserId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<boolean>} True iff an APPROVED row with canBook=true exists for this pair. */
  async existsApprovedBookable(_guardianUserId, _minorUserId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<GuardianshipRow[]>} */
  async listByGuardian(_guardianUserId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<GuardianshipRow[]>} */
  async listByStatus(_status) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<GuardianshipRow>} */
  async decide(_id, _status, _decidedAt, _decidedBy, _decisionNotes) {
    throw new Error('Not implemented');
  }
}
