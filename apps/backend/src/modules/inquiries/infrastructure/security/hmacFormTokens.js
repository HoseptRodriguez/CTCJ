import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * "<issuedAtMs>.<nonce>.<signature>" signed with a key derived from the
 * server secret: the browser can read it but not forge an older time.
 *
 * @param {{ secret: string }} options
 * @returns {import('../../application/ports/FormTokenService.js').FormTokenService}
 */
export function createHmacFormTokens({ secret }) {
  const key = createHmac('sha256', secret).update('ctcj-info-request-form').digest();
  const sign = (payload) => createHmac('sha256', key).update(payload).digest('base64url');

  return {
    issue(now) {
      const payload = `${now.getTime()}.${randomBytes(9).toString('base64url')}`;
      return `${payload}.${sign(payload)}`;
    },

    verify(token) {
      const parts = String(token ?? '').split('.');
      if (parts.length !== 3) return null;
      const payload = `${parts[0]}.${parts[1]}`;
      const expected = Buffer.from(sign(payload));
      const given = Buffer.from(parts[2]);
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
      const ms = Number(parts[0]);
      return Number.isFinite(ms) ? new Date(ms) : null;
    },
  };
}
