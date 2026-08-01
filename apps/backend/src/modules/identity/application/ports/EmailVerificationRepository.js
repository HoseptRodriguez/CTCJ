/** Port for email-verification token persistence (tokens stored as SHA-256 hashes). */
export class EmailVerificationRepository {
  async create(_userId, _tokenHash, _expiresAt) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<{id: string, userId: string, expiresAt: Date, consumedAt: Date|null}|null>} */
  async findByHash(_tokenHash) {
    throw new Error('Not implemented');
  }

  async markConsumed(_id) {
    throw new Error('Not implemented');
  }
}
