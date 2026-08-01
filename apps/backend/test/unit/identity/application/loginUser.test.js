import { beforeEach, describe, expect, it } from 'vitest';

import { createLoginUser } from '../../../../src/modules/identity/application/useCases/loginUser.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { InvalidCredentials } from '../../../../src/modules/identity/domain/errors/InvalidCredentials.js';
import { AccountLockedError } from '../../../../src/modules/identity/domain/errors/AccountLockedError.js';
import { EmailNotVerified } from '../../../../src/modules/identity/domain/errors/EmailNotVerified.js';

import {
  createFakeUserRepository,
  createFakePasswordHasher,
  createFakeTokenService,
  createFakeRefreshTokenRepository,
  createFakeClock,
} from './fakes.js';

const CLUB_ID = 'club-1';
const NOW = new Date('2026-08-01T10:00:00Z');

async function seedActiveUser(
  userRepository,
  { email = 'jugador@example.com', password = 'ClaveSegura123' } = {},
) {
  const user = User.registerPublic({
    id: 'user-1',
    clubId: CLUB_ID,
    email,
    passwordHash: `hashed:${password}`,
    firstName: 'Ana',
    lastName: 'Gomez',
  });
  user.verifyEmail(NOW);
  await userRepository.create(user);
  return user;
}

function buildDeps() {
  return {
    userRepository: createFakeUserRepository(),
    passwordHasher: createFakePasswordHasher(),
    tokenService: createFakeTokenService(),
    refreshTokenRepository: createFakeRefreshTokenRepository(),
    clock: createFakeClock(NOW),
    clubId: CLUB_ID,
    refreshTokenTtlMs: 30 * 24 * 60 * 60 * 1000,
  };
}

describe('loginUser', () => {
  let deps;
  let loginUser;

  beforeEach(() => {
    deps = buildDeps();
    loginUser = createLoginUser(deps);
  });

  it('returns an access token, refresh token, and roles on success', async () => {
    await seedActiveUser(deps.userRepository);

    const result = await loginUser({
      email: 'jugador@example.com',
      password: 'ClaveSegura123',
      ip: '127.0.0.1',
      userAgent: 'vitest',
    });

    expect(result.accessToken).toContain('user-1');
    expect(result.roles).toEqual(['USUARIO']);
    expect(result.refreshToken).toBeTruthy();
  });

  it('rejects a nonexistent account with the generic InvalidCredentials error', async () => {
    await expect(
      loginUser({ email: 'nadie@example.com', password: 'ClaveSegura123' }),
    ).rejects.toThrow(InvalidCredentials);
  });

  it('rejects a wrong password with the generic InvalidCredentials error and increments the failure counter', async () => {
    await seedActiveUser(deps.userRepository);

    await expect(
      loginUser({ email: 'jugador@example.com', password: 'ClaveIncorrecta' }),
    ).rejects.toThrow(InvalidCredentials);

    const user = await deps.userRepository.findById('user-1');
    expect(user.failedLoginCount).toBe(1);
  });

  it('locks the account after 5 failed attempts and rejects further attempts as AccountLockedError', async () => {
    await seedActiveUser(deps.userRepository);

    for (let i = 0; i < 5; i += 1) {
      await expect(
        loginUser({ email: 'jugador@example.com', password: 'ClaveIncorrecta' }),
      ).rejects.toThrow(InvalidCredentials);
    }

    await expect(
      loginUser({ email: 'jugador@example.com', password: 'ClaveSegura123' }),
    ).rejects.toThrow(AccountLockedError);
  });

  it('InvalidCredentials and AccountLockedError render the same message (uniform response)', async () => {
    await seedActiveUser(deps.userRepository);
    for (let i = 0; i < 5; i += 1) {
      await loginUser({ email: 'jugador@example.com', password: 'x' }).catch(() => {});
    }

    let wrongPasswordMessage;
    try {
      await loginUser({ email: 'nadie@example.com', password: 'x' });
    } catch (err) {
      wrongPasswordMessage = err.message;
    }

    let lockedMessage;
    try {
      await loginUser({ email: 'jugador@example.com', password: 'ClaveSegura123' });
    } catch (err) {
      lockedMessage = err.message;
    }

    expect(wrongPasswordMessage).toBe(lockedMessage);
  });

  it('rejects login for an unverified account only after the password is confirmed correct', async () => {
    const user = User.registerPublic({
      id: 'user-2',
      clubId: CLUB_ID,
      email: 'sinverificar@example.com',
      passwordHash: 'hashed:ClaveSegura123',
      firstName: 'Luis',
      lastName: 'Perez',
    });
    await deps.userRepository.create(user);

    await expect(
      loginUser({ email: 'sinverificar@example.com', password: 'ClaveIncorrecta' }),
    ).rejects.toThrow(InvalidCredentials);

    await expect(
      loginUser({ email: 'sinverificar@example.com', password: 'ClaveSegura123' }),
    ).rejects.toThrow(EmailNotVerified);
  });

  it('a successful login resets the failed-attempt counter', async () => {
    await seedActiveUser(deps.userRepository);

    await loginUser({ email: 'jugador@example.com', password: 'ClaveIncorrecta' }).catch(() => {});
    await loginUser({ email: 'jugador@example.com', password: 'ClaveIncorrecta' }).catch(() => {});

    await loginUser({ email: 'jugador@example.com', password: 'ClaveSegura123' });

    const user = await deps.userRepository.findById('user-1');
    expect(user.failedLoginCount).toBe(0);
  });
});
