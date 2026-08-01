import { createHash, randomBytes } from 'node:crypto';

import jwt from 'jsonwebtoken';

/**
 * @param {{ accessSecret: string, accessTtlSeconds: number }} options
 * @returns {import('../../application/ports/TokenService.js').TokenService}
 */
export function createJwtTokenService({ accessSecret, accessTtlSeconds }) {
  return {
    issueAccessToken(userId, roleCodes) {
      // Claims limited to {sub, roles, iat, exp} -- no PII in the token.
      const token = jwt.sign({ roles: roleCodes }, accessSecret, {
        subject: userId,
        expiresIn: accessTtlSeconds,
      });
      return { token, expiresInSeconds: accessTtlSeconds };
    },

    generateRefreshToken() {
      return randomBytes(32).toString('base64url');
    },

    hashRefreshToken(rawToken) {
      return createHash('sha256').update(rawToken).digest('hex');
    },

    generateOpaqueToken() {
      return randomBytes(32).toString('base64url');
    },

    hashOpaqueToken(rawToken) {
      return createHash('sha256').update(rawToken).digest('hex');
    },
  };
}
