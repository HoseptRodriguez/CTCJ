import { randomUUID } from 'node:crypto';

import { User } from '../../domain/entities/User.js';
import { EmailAlreadyRegistered } from '../errors/EmailAlreadyRegistered.js';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   passwordHasher: import('../ports/PasswordHasher.js').PasswordHasher,
 *   tokenService: import('../ports/TokenService.js').TokenService,
 *   emailVerificationRepository: import('../ports/EmailVerificationRepository.js').EmailVerificationRepository,
 *   emailSender: import('../ports/EmailSender.js').EmailSender,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 *   appPublicUrl: string,
 * }} deps
 */
export function createRegisterUser({
  userRepository,
  passwordHasher,
  tokenService,
  emailVerificationRepository,
  emailSender,
  clock,
  clubId,
  appPublicUrl,
}) {
  return async function registerUser({ email, password, firstName, lastName }) {
    const normalizedEmail = User.normalizeEmail(email);

    const alreadyExists = await userRepository.existsByEmail(clubId, normalizedEmail);
    if (alreadyExists) {
      throw new EmailAlreadyRegistered();
    }

    const passwordHash = await passwordHasher.hash(password);
    const user = User.registerPublic({
      id: randomUUID(),
      clubId,
      email: normalizedEmail,
      passwordHash,
      firstName,
      lastName,
    });

    const savedUser = await userRepository.create(user);

    const rawToken = tokenService.generateOpaqueToken();
    const tokenHash = tokenService.hashOpaqueToken(rawToken);
    const expiresAt = new Date(clock.now().getTime() + VERIFICATION_TOKEN_TTL_MS);
    await emailVerificationRepository.create(savedUser.id, tokenHash, expiresAt);

    const verificationUrl = `${appPublicUrl}/verify-email?token=${rawToken}`;
    await emailSender.sendVerificationEmail(savedUser.email, verificationUrl);

    return { userId: savedUser.id };
  };
}
