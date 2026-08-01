/**
 * Port for refresh-token persistence. Tokens are stored as SHA-256 hashes,
 * never plaintext -- hashing happens in the infrastructure adapter.
 */
export class RefreshTokenRepository {
  /**
   * @returns {Promise<{id: string, familyId: string, expiresAt: Date}>}
   */
  async create(_userId, _tokenHash, _familyId, _expiresAt, _ipAddress, _userAgent) {
    throw new Error('Not implemented');
  }

  /**
   * @returns {Promise<{id: string, userId: string, familyId: string, expiresAt: Date, revokedAt: Date|null, replacedBy: string|null}|null>}
   */
  async findByHash(_tokenHash) {
    throw new Error('Not implemented');
  }

  /** Marks `oldTokenId` as replaced by the row created for `newTokenHash`, same family. */
  async rotate(_oldTokenId, _newTokenHash, _expiresAt, _ipAddress, _userAgent) {
    throw new Error('Not implemented');
  }

  /** Reuse-detection response: revokes every token in the family. */
  async revokeFamily(_familyId) {
    throw new Error('Not implemented');
  }

  async revokeById(_tokenId) {
    throw new Error('Not implemented');
  }

  async revokeAllForUser(_userId) {
    throw new Error('Not implemented');
  }
}
