import { describe, expect, it } from 'vitest';

import { User, UserStatus } from '../../../../src/modules/identity/domain/entities/User.js';
import { EmailNotVerified } from '../../../../src/modules/identity/domain/errors/EmailNotVerified.js';

function buildUser() {
  return User.registerPublic({
    id: 'user-1',
    clubId: 'club-1',
    email: 'jugador@example.com',
    passwordHash: 'hash',
    firstName: 'Ana',
    lastName: 'Gomez',
  });
}

describe('Regla: una cuenta no verificada no puede operar', () => {
  it('a freshly registered user is PENDING_VERIFICATION and unverified', () => {
    const user = buildUser();
    expect(user.status).toBe(UserStatus.PENDING_VERIFICATION);
    expect(() => user.ensureEmailVerified()).toThrow(EmailNotVerified);
  });

  it('verifying the email activates the account', () => {
    const user = buildUser();
    const now = new Date('2026-08-01T10:00:00Z');
    user.verifyEmail(now);
    expect(user.status).toBe(UserStatus.ACTIVE);
    expect(user.emailVerifiedAt).toBe(now);
    expect(() => user.ensureEmailVerified()).not.toThrow();
  });

  it('verifying an already-verified email is idempotent', () => {
    const user = buildUser();
    const first = new Date('2026-08-01T10:00:00Z');
    const second = new Date('2026-08-01T11:00:00Z');
    user.verifyEmail(first);
    user.verifyEmail(second);
    expect(user.emailVerifiedAt).toBe(first);
  });
});
