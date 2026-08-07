import { InvalidPasswordResetToken } from '../errors/InvalidPasswordResetToken.js';

/**
 * Consumes a password-reset token: validates it (single-use, not expired),
 * sets the new password, and revokes every refresh token the user holds --
 * a password change should end every existing session, not just the one
 * that requested the reset (e.g. a stolen device left logged in).
 *
 * @param {{
 *   passwordResetRepository: import('../ports/PasswordResetRepository.js').PasswordResetRepository,
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   passwordHasher: import('../ports/PasswordHasher.js').PasswordHasher,
 *   tokenService: import('../ports/TokenService.js').TokenService,
 *   refreshTokenRepository: import('../ports/RefreshTokenRepository.js').RefreshTokenRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createConfirmPasswordReset({
  passwordResetRepository,
  userRepository,
  passwordHasher,
  tokenService,
  refreshTokenRepository,
  clock,
}) {
  /** @param {{ rawToken: string, newPassword: string }} input */
  return async function confirmPasswordReset({ rawToken, newPassword }) {
    const tokenHash = tokenService.hashOpaqueToken(rawToken);
    const record = await passwordResetRepository.findByHash(tokenHash);
    const now = clock.now();

    if (!record || record.consumedAt || record.expiresAt < now) {
      throw new InvalidPasswordResetToken();
    }

    const user = await userRepository.findById(record.userId);
    if (!user) {
      throw new InvalidPasswordResetToken();
    }

    const newPasswordHash = await passwordHasher.hash(newPassword);
    user.changePassword(newPasswordHash);
    await userRepository.update(user);
    await passwordResetRepository.markConsumed(record.id);
    await refreshTokenRepository.revokeAllForUser(user.id);

    return { userId: user.id };
  };
}
