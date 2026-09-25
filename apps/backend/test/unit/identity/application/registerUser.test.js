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

  it('rejects registration with an email that belongs to a verified account', async () => {
    const { userId } = await registerUser({
      email: 'jugador@example.com',
      password: 'ClaveSegura123',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    const user = await deps.userRepository.findById(userId);
    user.verifyEmail(new Date('2026-08-01T11:00:00Z'));
    await deps.userRepository.update(user);

    await expect(
      registerUser({
        email: 'JUGADOR@example.com',
        password: 'OtraClaveSegura1',
        firstName: 'Otro',
        lastName: 'Usuario',
      }),
    ).rejects.toThrow(EmailAlreadyRegistered);
  });

  it('resends the verification email when the address belongs to a never-verified account', async () => {
    const first = await registerUser({
      email: 'jugador@example.com',
      password: 'ClaveSegura123',
      firstName: 'Ana',
      lastName: 'Gomez',
    });

    const second = await registerUser({
      email: 'JUGADOR@example.com',
      password: 'OtraClaveSegura1',
      firstName: 'Otro',
      lastName: 'Usuario',
    });

    expect(second.userId).toBe(first.userId);
    expect(deps.emailSender.sent).toHaveLength(2);
    expect(deps.emailSender.sent[1].toEmail).toBe('jugador@example.com');
    expect(deps.emailSender.sent[1].verificationUrl).toContain('/verify-email?token=');
    expect(deps.emailSender.sent[1].verificationUrl).not.toBe(
      deps.emailSender.sent[0].verificationUrl,
    );
  });

  it('never overwrites the credentials of the unverified account it resends for', async () => {
    const { userId } = await registerUser({
      email: 'jugador@example.com',
      password: 'ClaveSegura123',
      firstName: 'Ana',
      lastName: 'Gomez',
    });

    await registerUser({
      email: 'jugador@example.com',
      password: 'ClaveDelAtacante1',
      firstName: 'Otro',
      lastName: 'Usuario',
    });

    const user = await deps.userRepository.findById(userId);
    expect(user.passwordHash).toBe('hashed:ClaveSegura123');
    expect(user.firstName).toBe('Ana');
  });

  it('lets a registration whose verification email failed to send be retried', async () => {
    const realSend = deps.emailSender.sendVerificationEmail;
    deps.emailSender.sendVerificationEmail = async () => {
      throw new Error('SMTP connection refused');
    };
    await expect(
      registerUser({
        email: 'jugador@example.com',
        password: 'ClaveSegura123',
        firstName: 'Ana',
        lastName: 'Gomez',
      }),
    ).rejects.toThrow('SMTP connection refused');

    deps.emailSender.sendVerificationEmail = realSend;
    await expect(
      registerUser({
        email: 'jugador@example.com',
        password: 'ClaveSegura123',
        firstName: 'Ana',
        lastName: 'Gomez',
      }),
    ).resolves.toEqual({ userId: expect.any(String) });
    expect(deps.emailSender.sent).toHaveLength(1);
  });

  it('rejects an unverified address whose account is no longer pending (e.g. suspended)', async () => {
    const { userId } = await registerUser({
      email: 'jugador@example.com',
      password: 'ClaveSegura123',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    const user = await deps.userRepository.findById(userId);
    user.status = 'SUSPENDED';
    await deps.userRepository.update(user);

    await expect(
      registerUser({
        email: 'jugador@example.com',
        password: 'ClaveSegura123',
        firstName: 'Ana',
        lastName: 'Gomez',
      }),
    ).rejects.toThrow(EmailAlreadyRegistered);
    expect(deps.emailSender.sent).toHaveLength(1);
  });
});
