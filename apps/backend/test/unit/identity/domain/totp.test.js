import { describe, expect, it } from 'vitest';

import {
  base32Decode,
  base32Encode,
  generateRecoveryCodes,
  normalizeRecoveryCode,
  otpauthUri,
  totpForStep,
  verifyTotp,
} from '../../../../src/modules/identity/domain/services/totp.js';

// RFC 6238, appendix B: SHA1 seed "12345678901234567890" (the 8-digit
// values end in these 6 digits).
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));
const RFC_VECTORS = [
  [59, '287082'],
  [1111111109, '081804'],
  [1111111111, '050471'],
  [1234567890, '005924'],
  [2000000000, '279037'],
];

describe('TOTP (RFC 6238)', () => {
  it('base32 round trip', () => {
    const bytes = Buffer.from([0, 1, 2, 250, 251, 255, 17, 99]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
    expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
  });

  it.each(RFC_VECTORS)('official test vector at t=%i', (seconds, code) => {
    expect(totpForStep(RFC_SECRET, Math.floor(seconds / 30))).toBe(code);
  });

  it('accepts one step of clock drift, never a reused step', () => {
    const now = new Date(1111111111 * 1000);
    const step = Math.floor(1111111111 / 30);
    expect(verifyTotp(RFC_SECRET, '050471', now)).toBe(step);
    expect(verifyTotp(RFC_SECRET, totpForStep(RFC_SECRET, step - 1), now)).toBe(step - 1);
    expect(verifyTotp(RFC_SECRET, totpForStep(RFC_SECRET, step - 2), now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, '050471', now, { lastUsedStep: step })).toBeNull();
    expect(verifyTotp(RFC_SECRET, '05047', now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, '050 471', now)).toBe(step);
  });

  it('otpauth URI for the QR code', () => {
    expect(otpauthUri({ secret: 'ABC', accountName: 'ana@x.co', issuer: 'Club CTCJ' })).toBe(
      'otpauth://totp/Club%20CTCJ%3Aana%40x.co?secret=ABC&issuer=Club+CTCJ&algorithm=SHA1&digits=6&period=30',
    );
  });

  it('10 distinct recovery codes, easy to read and type', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(normalizeRecoveryCode(' k7qh-3mzp ')).toBe('K7QH3MZP');
  });
});
