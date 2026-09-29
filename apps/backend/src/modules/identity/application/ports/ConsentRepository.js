/**
 * Proof of every authorization (the `consents` table). Append-only by
 * design: there is no update and no delete here -- a withdrawal is a new row.
 *
 * @typedef {{ id: string, userId: string, givenBy: string|null, consentType: string,
 *   documentVersion: string, action: string, details: object|null,
 *   ipAddress: string|null, userAgent: string|null, createdAt: Date }} ConsentRow
 */
export class ConsentRepository {
  /**
   * @param {{ userId: string, givenBy?: string|null, consentType: string, documentVersion: string,
   *   action: string, details?: object|null, ipAddress?: string|null, userAgent?: string|null }} _entry
   * @returns {Promise<ConsentRow>}
   */
  async append(_entry) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<ConsentRow|null>} the most recent row of that type for the user */
  async findLatest(_userId, _consentType) {
    throw new Error('Not implemented');
  }

  /** Every row of a person, oldest first (the full history). */
  async listByUser(_userId) {
    throw new Error('Not implemented');
  }
}
