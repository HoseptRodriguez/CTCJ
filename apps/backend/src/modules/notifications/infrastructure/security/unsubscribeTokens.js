import { createHmac, timingSafeEqual } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORY = /^[A-Z_]{3,30}$/;

/**
 * Signed links for "Dejar de recibir estos correos": they work with one
 * click and without logging in, and can't be forged or changed to another
 * person or category. HMAC-SHA256 with a key derived from the server
 * secret (never the secret itself). No expiry: an unsubscribe link must
 * keep working for as long as the email exists.
 *
 * @param {{ secret: string }} options
 */
export function createUnsubscribeTokens({ secret }) {
  const key = createHmac('sha256', secret).update('ctcj:unsubscribe:v1').digest();
  const sign = (payload) => createHmac('sha256', key).update(payload).digest('base64url');

  return {
    /** @returns {string} */
    create(userId, category) {
      const payload = Buffer.from(`${userId}.${category}`).toString('base64url');
      return `${payload}.${sign(payload)}`;
    },

    /** @returns {{ userId: string, category: string }|null} */
    verify(token) {
      if (typeof token !== 'string' || token.length > 300) return null;
      const [payload, signature, extra] = token.split('.');
      if (!payload || !signature || extra !== undefined) return null;
      const expected = Buffer.from(sign(payload));
      const given = Buffer.from(signature);
      if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
      const [userId, category] = Buffer.from(payload, 'base64url').toString('utf8').split('.');
      if (!UUID.test(userId ?? '') || !CATEGORY.test(category ?? '')) return null;
      return { userId, category };
    },
  };
}
