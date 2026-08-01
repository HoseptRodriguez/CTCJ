import { beforeEach, describe, expect, it } from 'vitest';

import { createVerifyEmail } from '../../../../src/modules/identity/application/useCases/verifyEmail.js';
import { createRegisterUser } from '../../../../src/modules/identity/application/useCases/registerUser.js';
import { InvalidVerificationToken } from '../../../../src/modules/identity/application/errors/InvalidVerificationToken.js';

import {
  createFakeUserRepository,
  createFakeEmailVerificationRepository,
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
    passwordHasher: createFakePasswordHasher(),
    tokenService: createFakeTokenService(),
    emailSender: createFakeEmailSender(),
    clock: createFakeClock(NOW),
    clubId: 'club-1',
    appPublicUrl: 'http://localhost:5173',
  };
}

describe('verifyEmail', () => {
  let deps;
  let registerUser;
  let verifyEmail;

  beforeEach(() => {
    deps = buildDeps();
    registerUser = createRegisterUser(deps);
    verifyEmail = createVerifyEmail(deps);
  });

  it('activates the account when given the raw token from the verification email', async () => {
    await registerUser({
      email: 'jugador@example.com',
      password: 'ClaveSegura123',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    const url = new URL(deps.emailSender.sent[0].verificationUrl);
    const rawToken = url.searchParams.get('token');

    const { userId } = await verifyEmail({ rawToken });

    const user = await deps.userRepository.findById(userId);
    expect(user.status).toBe('ACTIVE');
    expect(user.emailVerifiedAt).toBe(NOW);
  });

  it('rejects an unknown token', async () => {
    await expect(verifyEmail({ rawToken: 'not-a-real-token' })).rejects.toThrow(
      InvalidVerificationToken,
    );
  });

  it('rejects a token that has already been consumed', async () => {
    await registerUser({
      email: 'jugador@example.com',
      password: 'ClaveSegura123',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    const url = new URL(deps.emailSender.sent[0].verificationUrl);
    const rawToken = url.searchParams.get('token');

    await verifyEmail({ rawToken });

    await expect(verifyEmail({ rawToken })).rejects.toThrow(InvalidVerificationToken);
  });

  it('rejects an expired token', async () => {
    await registerUser({
      email: 'jugador@example.com',
      password: 'ClaveSegura123',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    const url = new URL(deps.emailSender.sent[0].verificationUrl);
    const rawToken = url.searchParams.get('token');

    deps.clock.advanceMs(25 * 60 * 60 * 1000); // past the 24h TTL

    await expect(verifyEmail({ rawToken })).rejects.toThrow(InvalidVerificationToken);
  });
});
