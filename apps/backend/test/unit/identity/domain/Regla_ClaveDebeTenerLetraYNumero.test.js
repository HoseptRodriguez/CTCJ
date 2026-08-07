import { describe, expect, it } from 'vitest';

import { hasLetterAndNumber } from '../../../../src/modules/identity/domain/policies/passwordPolicy.js';

describe('Regla: la clave debe incluir al menos una letra y un número', () => {
  it('accepts a password with both a letter and a digit', () => {
    expect(hasLetterAndNumber('abc12345')).toBe(true);
  });

  it('rejects an all-digit password', () => {
    expect(hasLetterAndNumber('1234567890')).toBe(false);
  });

  it('rejects an all-letter password', () => {
    expect(hasLetterAndNumber('abcdefghij')).toBe(false);
  });

  it('accepts a password with letters, digits, and symbols', () => {
    expect(hasLetterAndNumber('123456Hosept+')).toBe(true);
  });

  it('rejects non-string input', () => {
    expect(hasLetterAndNumber(undefined)).toBe(false);
    expect(hasLetterAndNumber(12345678901)).toBe(false);
  });
});
