import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM for the TOTP secrets ("v1.<iv>.<tag>.<ciphertext>", base64url)
 * and HMAC-SHA256 for the recovery codes, both with MFA_ENCRYPTION_KEY
 * (32 bytes). Without the key, a copy of the database doesn't reveal them.
 *
 * @param {{ key: Buffer }} options
 * @returns {import('../../application/ports/MfaCrypto.js').MfaCrypto}
 */
export function createAesMfaCrypto({ key }) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('MFA key must be 32 bytes');
  const hmacKey = createHmac('sha256', key).update('recovery-codes').digest();
  const b64 = (buf) => buf.toString('base64url');

  return {
    encryptSecret(plain) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
      return ['v1', b64(iv), b64(cipher.getAuthTag()), b64(data)].join('.');
    },

    decryptSecret(stored) {
      const [version, iv, tag, data] = String(stored).split('.');
      if (version !== 'v1') throw new Error('Unknown MFA secret format');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(data, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    },

    hashRecoveryCode(code) {
      return createHmac('sha256', hmacKey).update(code).digest('hex');
    },
  };
}
