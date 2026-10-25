import { createHash, createHmac, randomBytes } from 'node:crypto';

import jwt from 'jsonwebtoken';

/**
 * @param {{ accessSecret: string, accessTtlSeconds: number }} options
 * @returns {import('../../application/ports/TokenService.js').TokenService}
 */
export function createJwtTokenService({ accessSecret, accessTtlSeconds }) {
  // Signed with a key derived from (but different to) the access secret, so
  // an MFA step token can never pass as an access token in requireAuth.
  const mfaSecret = createHmac('sha256', accessSecret).update('ctcj-mfa-step').digest();
  const MFA_TTL_SECONDS = 10 * 60;

  return {
    issueMfaToken(userId, purpose) {
      return jwt.sign({ purpose }, mfaSecret, {
        subject: userId,
        expiresIn: MFA_TTL_SECONDS,
        audience: 'ctcj-mfa',
      });
    },

    verifyMfaToken(token, purpose) {
      try {
        const payload = jwt.verify(token, mfaSecret, { audience: 'ctcj-mfa' });
        return payload.purpose === purpose ? payload.sub : null;
      } catch {
        return null;
      }
    },

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
