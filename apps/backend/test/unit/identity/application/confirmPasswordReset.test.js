import { beforeEach, describe, expect, it } from 'vitest';

import { createConfirmPasswordReset } from '../../../../src/modules/identity/application/useCases/confirmPasswordReset.js';
import { createRequestPasswordReset } from '../../../../src/modules/identity/application/useCases/requestPasswordReset.js';
import { createRegisterUser } from '../../../../src/modules/identity/application/useCases/registerUser.js';
import { InvalidPasswordResetToken } from '../../../../src/modules/identity/application/errors/InvalidPasswordResetToken.js';

import {
  createFakeUserRepository,
  createFakeEmailVerificationRepository,
  createFakePasswordResetRepository,
  createFakeRefreshTokenRepository,
  createFakePasswordHasher,
  createFakeTokenService,
  createFakeEmailSender,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-08-01T10:00:00Z');

function buildDeps() {
  return {
    userRepository: createFakeUserRepository(),
    emailVerificationRepository: createFakeEmailVerificationRepository(),
    passwordResetRepository: createFakePasswordResetRepository(),
    refreshTokenRepository: createFakeRefreshTokenRepository(),
    passwordHasher: createFakePasswordHasher(),
    tokenService: createFakeTokenService(),
    emailSender: createFakeEmailSender(),
    clock: createFakeClock(NOW),
    clubId: 'club-1',
    appPublicUrl: 'http://localhost:5173',
  };
}

async function registerAndRequestReset(deps, registerUser, requestPasswordReset) {
  await registerUser({
    email: 'jugador@example.com',
    password: 'ClaveSegura123',
    firstName: 'Ana',
    lastName: 'Gomez',
  });
  await requestPasswordReset({ email: 'jugador@example.com' });
  const url = new URL(deps.emailSender.passwordResetsSent[0].resetUrl);
  return url.searchParams.get('token');
}

describe('confirmPasswordReset', () => {
  let deps;
  let registerUser;
  let requestPasswordReset;
  let confirmPasswordReset;

  beforeEach(() => {
    deps = buildDeps();
    registerUser = createRegisterUser(deps);
    requestPasswordReset = createRequestPasswordReset(deps);
    confirmPasswordReset = createConfirmPasswordReset(deps);
  });

  it('sets the new password hash and returns the userId', async () => {
    const rawToken = await registerAndRequestReset(deps, registerUser, requestPasswordReset);

    const { userId } = await confirmPasswordReset({ rawToken, newPassword: 'NuevaClave123' });

    const user = await deps.userRepository.findById(userId);
    expect(user.passwordHash).toBe('hashed:NuevaClave123');
  });

  it('revokes every existing refresh token for the user', async () => {
    const rawToken = await registerAndRequestReset(deps, registerUser, requestPasswordReset);
    const user = await deps.userRepository.findByEmail('club-1', 'jugador@example.com');
    await deps.refreshTokenRepository.create(user.id, 'hash-1', 'family-1', new Date(), null, null);

    await confirmPasswordReset({ rawToken, newPassword: 'NuevaClave123' });

    const record = await deps.refreshTokenRepository.findByHash('hash-1');
    expect(record.revokedAt).not.toBeNull();
  });

  it('rejects an unknown token', async () => {
    await expect(
      confirmPasswordReset({ rawToken: 'not-a-real-token', newPassword: 'NuevaClave123' }),
    ).rejects.toThrow(InvalidPasswordResetToken);
  });

  it('rejects a token that has already been consumed', async () => {
    const rawToken = await registerAndRequestReset(deps, registerUser, requestPasswordReset);
    await confirmPasswordReset({ rawToken, newPassword: 'NuevaClave123' });

    await expect(confirmPasswordReset({ rawToken, newPassword: 'OtraClave456' })).rejects.toThrow(
      InvalidPasswordResetToken,
    );
  });

  it('rejects an expired token', async () => {
    const rawToken = await registerAndRequestReset(deps, registerUser, requestPasswordReset);

    deps.clock.advanceMs(61 * 60 * 1000); // past the 1h TTL

    await expect(confirmPasswordReset({ rawToken, newPassword: 'NuevaClave123' })).rejects.toThrow(
      InvalidPasswordResetToken,
    );
  });
});
