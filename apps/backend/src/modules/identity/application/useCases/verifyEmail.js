import { InvalidVerificationToken } from '../errors/InvalidVerificationToken.js';

/**
 * @param {{
 *   emailVerificationRepository: import('../ports/EmailVerificationRepository.js').EmailVerificationRepository,
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   tokenService: import('../ports/TokenService.js').TokenService,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createVerifyEmail({
  emailVerificationRepository,
  userRepository,
  tokenService,
  clock,
}) {
  return async function verifyEmail({ rawToken }) {
    const tokenHash = tokenService.hashOpaqueToken(rawToken);
    const record = await emailVerificationRepository.findByHash(tokenHash);
    const now = clock.now();

    if (!record || record.consumedAt || record.expiresAt < now) {
      throw new InvalidVerificationToken();
    }

    const user = await userRepository.findById(record.userId);
    if (!user) {
      throw new InvalidVerificationToken();
    }

    user.verifyEmail(now);
    await userRepository.update(user);
    await emailVerificationRepository.markConsumed(record.id);

    return { userId: user.id };
  };
}
