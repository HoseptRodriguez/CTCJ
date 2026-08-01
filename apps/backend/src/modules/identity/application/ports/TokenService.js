export class TokenService {
  /**
   * Issues a short-lived signed access token. Claims must be limited to
   * {sub, roles, iat, exp} -- no PII in the token.
   * @returns {{token: string, expiresInSeconds: number}}
   */
  issueAccessToken(_userId, _roleCodes) {
    throw new Error('Not implemented');
  }

  /** Generates a new opaque refresh token value (not a JWT). @returns {string} */
  generateRefreshToken() {
    throw new Error('Not implemented');
  }

  /** @returns {string} SHA-256 hash, hex-encoded. */
  hashRefreshToken(_rawToken) {
    throw new Error('Not implemented');
  }

  /** @returns {string} A random opaque token suitable for email verification / password reset links. */
  generateOpaqueToken() {
    throw new Error('Not implemented');
  }

  /** @returns {string} SHA-256 hash, hex-encoded. */
  hashOpaqueToken(_rawToken) {
    throw new Error('Not implemented');
  }
}
