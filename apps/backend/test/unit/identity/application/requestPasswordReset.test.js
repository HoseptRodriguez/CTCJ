import { beforeEach, describe, expect, it } from 'vitest';

import { createRequestPasswordReset } from '../../../../src/modules/identity/application/useCases/requestPasswordReset.js';
import { createRegisterUser } from '../../../../src/modules/identity/application/useCases/registerUser.js';

import {
  createFakeUserRepository,
  createFakeEmailVerificationRepository,
  createFakePasswordResetRepository,
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
    passwordHasher: createFakePasswordHasher(),
    tokenService: createFakeTokenService(),
    emailSender: createFakeEmailSender(),
    clock: createFakeClock(NOW),
    clubId: 'club-1',
    appPublicUrl: 'http://localhost:5173',
  };
}

describe('requestPasswordReset', () => {
  let deps;
  let registerUser;
  let requestPasswordReset;

  beforeEach(() => {
    deps = buildDeps();
    registerUser = createRegisterUser(deps);
    requestPasswordReset = createRequestPasswordReset(deps);
  });

  it('sends a reset email with a working token URL for a known email', async () => {
    await registerUser({
      email: 'jugador@example.com',
      password: 'ClaveSegura123',
      firstName: 'Ana',
      lastName: 'Gomez',
    });

    await requestPasswordReset({ email: 'jugador@example.com' });

    expect(deps.emailSender.passwordResetsSent).toHaveLength(1);
    expect(deps.emailSender.passwordResetsSent[0].toEmail).toBe('jugador@example.com');
    const url = new URL(deps.emailSender.passwordResetsSent[0].resetUrl);
    expect(url.pathname).toBe('/reset-password');
    expect(url.searchParams.get('token')).toBeTruthy();
  });

  it('does not throw and sends no email for an unknown email (no user enumeration)', async () => {
    await expect(requestPasswordReset({ email: 'no-such-account@example.com' })).resolves.toEqual(
      {},
    );

    expect(deps.emailSender.passwordResetsSent).toHaveLength(0);
  });
});
