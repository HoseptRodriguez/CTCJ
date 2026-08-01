import { beforeEach, describe, expect, it } from 'vitest';

import { createRegisterUser } from '../../../../src/modules/identity/application/useCases/registerUser.js';
import { EmailAlreadyRegistered } from '../../../../src/modules/identity/application/errors/EmailAlreadyRegistered.js';

import {
  createFakeUserRepository,
  createFakeEmailVerificationRepository,
  createFakePasswordHasher,
  createFakeTokenService,
  createFakeEmailSender,
  createFakeClock,
} from './fakes.js';

const CLUB_ID = 'club-1';

function buildDeps() {
  return {
    userRepository: createFakeUserRepository(),
    emailVerificationRepository: createFakeEmailVerificationRepository(),
    passwordHasher: createFakePasswordHasher(),
    tokenService: createFakeTokenService(),
    emailSender: createFakeEmailSender(),
    clock: createFakeClock(new Date('2026-08-01T10:00:00Z')),
    clubId: CLUB_ID,
    appPublicUrl: 'http://localhost:5173',
  };
}

describe('registerUser', () => {
  let deps;
  let registerUser;

  beforeEach(() => {
    deps = buildDeps();
    registerUser = createRegisterUser(deps);
  });

  it('creates a PENDING_VERIFICATION user with only the USUARIO role', async () => {
    const { userId } = await registerUser({
      email: 'Jugador@Example.com',
      password: 'ClaveSegura123',
      firstName: 'Ana',
      lastName: 'Gomez',
    });

    const user = await deps.userRepository.findById(userId);
    expect(user.status).toBe('PENDING_VERIFICATION');
    expect(user.listRoleCodes()).toEqual(['USUARIO']);
    expect(user.email).toBe('jugador@example.com');
    expect(user.passwordHash).toBe('hashed:ClaveSegura123');
  });

  it('sends a verification email with a link containing the raw token', async () => {
    await registerUser({
      email: 'jugador@example.com',
      password: 'ClaveSegura123',
      firstName: 'Ana',
      lastName: 'Gomez',
    });

    expect(deps.emailSender.sent).toHaveLength(1);
    expect(deps.emailSender.sent[0].toEmail).toBe('jugador@example.com');
    expect(deps.emailSender.sent[0].verificationUrl).toContain('/verify-email?token=');
  });

  it('rejects registration with an email already in use', async () => {
    await registerUser({
      email: 'jugador@example.com',
      password: 'ClaveSegura123',
      firstName: 'Ana',
      lastName: 'Gomez',
    });

    await expect(
      registerUser({
        email: 'JUGADOR@example.com',
        password: 'OtraClaveSegura1',
        firstName: 'Otro',
        lastName: 'Usuario',
      }),
    ).rejects.toThrow(EmailAlreadyRegistered);
  });
});
