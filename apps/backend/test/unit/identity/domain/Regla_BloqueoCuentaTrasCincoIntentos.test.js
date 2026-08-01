import { describe, expect, it } from 'vitest';

import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import {
  computeLockoutDurationMs,
  MAX_LOCK_DURATION_MS,
} from '../../../../src/modules/identity/domain/policies/lockoutPolicy.js';

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

describe('Regla: bloqueo de cuenta tras cinco intentos fallidos', () => {
  it('does not lock the account before the 5th failed attempt', () => {
    const user = buildUser();
    const now = new Date('2026-08-01T10:00:00Z');
    for (let i = 0; i < 4; i += 1) {
      user.recordFailedLogin(now);
    }
    expect(user.failedLoginCount).toBe(4);
    expect(user.isLocked(now)).toBe(false);
  });

  it('locks the account on the 5th failed attempt', () => {
    const user = buildUser();
    const now = new Date('2026-08-01T10:00:00Z');
    for (let i = 0; i < 5; i += 1) {
      user.recordFailedLogin(now);
    }
    expect(user.isLocked(now)).toBe(true);
  });

  it('lockout duration grows with further attempts beyond the threshold', () => {
    expect(computeLockoutDurationMs(5)).toBe(60_000); // 1 minute, over=1
    expect(computeLockoutDurationMs(6)).toBe(240_000); // 4 minutes, over=2
    expect(computeLockoutDurationMs(7)).toBe(540_000); // 9 minutes, over=3
  });

  it('lockout duration is capped at 1 hour', () => {
    expect(computeLockoutDurationMs(50)).toBe(MAX_LOCK_DURATION_MS);
  });

  it('a successful login resets the failed-attempt counter and unlocks', () => {
    const user = buildUser();
    const now = new Date('2026-08-01T10:00:00Z');
    for (let i = 0; i < 5; i += 1) {
      user.recordFailedLogin(now);
    }
    expect(user.isLocked(now)).toBe(true);

    user.recordSuccessfulLogin(now);
    expect(user.failedLoginCount).toBe(0);
    expect(user.isLocked(now)).toBe(false);
    expect(user.lastLoginAt).toBe(now);
  });

  it('the account unlocks once the lockout window has passed', () => {
    const user = buildUser();
    const now = new Date('2026-08-01T10:00:00Z');
    for (let i = 0; i < 5; i += 1) {
      user.recordFailedLogin(now);
    }
    const afterLockWindow = new Date(now.getTime() + 61_000);
    expect(user.isLocked(afterLockWindow)).toBe(false);
  });
});
