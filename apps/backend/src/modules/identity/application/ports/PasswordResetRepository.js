/** Port for password-reset token persistence (tokens stored as SHA-256
 * hashes, mirrors EmailVerificationRepository exactly). */
export class PasswordResetRepository {
  async create(_userId, _tokenHash, _expiresAt, _requestedIp) {
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
