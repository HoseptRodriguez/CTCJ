import { randomUUID } from 'node:crypto';

import { User, UserStatus } from '../../domain/entities/User.js';
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

    const existingUser = await userRepository.findByEmail(clubId, normalizedEmail);
    if (existingUser) {
      // A never-verified account is almost always a registration whose
      // verification email failed to send (or got lost) -- re-registering
      // resends the link instead of dead-ending on "email already in use".
      // The submitted password/name are deliberately ignored: overwriting
      // them would let anyone who knows an unverified address set that
      // account's password before its owner clicks the link.
      if (
        existingUser.status === UserStatus.PENDING_VERIFICATION &&
        !existingUser.emailVerifiedAt
      ) {
        await sendVerification(existingUser);
        return { userId: existingUser.id };
      }
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
    await sendVerification(savedUser);

    return { userId: savedUser.id };
  };

  async function sendVerification(user) {
    const rawToken = tokenService.generateOpaqueToken();
    const tokenHash = tokenService.hashOpaqueToken(rawToken);
    const expiresAt = new Date(clock.now().getTime() + VERIFICATION_TOKEN_TTL_MS);
    await emailVerificationRepository.create(user.id, tokenHash, expiresAt);

    const verificationUrl = `${appPublicUrl}/verify-email?token=${rawToken}`;
    await emailSender.sendVerificationEmail(user.email, verificationUrl);
  }
}
