import { describe, expect, it } from 'vitest';

import {
  isValidPasswordLength,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '../../../../src/modules/identity/domain/policies/passwordPolicy.js';

describe('Regla: la clave debe tener entre 10 y 100 caracteres', () => {
  it('rejects a password one character below the minimum', () => {
    expect(isValidPasswordLength('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false);
  });

  it('accepts a password exactly at the minimum', () => {
    expect(isValidPasswordLength('a'.repeat(PASSWORD_MIN_LENGTH))).toBe(true);
  });

  it('accepts a password exactly at the maximum', () => {
    expect(isValidPasswordLength('a'.repeat(PASSWORD_MAX_LENGTH))).toBe(true);
  });

  it('rejects a password one character above the maximum', () => {
    expect(isValidPasswordLength('a'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isValidPasswordLength(undefined)).toBe(false);
    expect(isValidPasswordLength(12345678901)).toBe(false);
  });
});
