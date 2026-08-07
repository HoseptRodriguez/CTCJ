const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h -- much shorter-lived than email verification (24h),
// since a leaked reset link is a direct account-takeover vector.

/**
 * No user enumeration: whether or not the email belongs to a real account,
 * this always resolves the same way and takes roughly the same shape of
 * work (an unknown email just skips the token/email steps) -- the caller
 * can never distinguish "sent" from "no such account" from the response
 * alone, mirroring the class of information a real self-service reset flow
 * must never leak.
 *
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   passwordResetRepository: import('../ports/PasswordResetRepository.js').PasswordResetRepository,
 *   tokenService: import('../ports/TokenService.js').TokenService,
 *   emailSender: import('../ports/EmailSender.js').EmailSender,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 *   appPublicUrl: string,
 * }} deps
 */
export function createRequestPasswordReset({
  userRepository,
  passwordResetRepository,
  tokenService,
  emailSender,
  clock,
  clubId,
  appPublicUrl,
}) {
  /** @param {{ email: string, ip?: string }} input */
  return async function requestPasswordReset({ email, ip = null }) {
    const user = await userRepository.findByEmail(clubId, email);
    if (!user) {
      return {};
    }

    const rawToken = tokenService.generateOpaqueToken();
    const tokenHash = tokenService.hashOpaqueToken(rawToken);
    const expiresAt = new Date(clock.now().getTime() + RESET_TOKEN_TTL_MS);
    await passwordResetRepository.create(user.id, tokenHash, expiresAt, ip);

    const resetUrl = `${appPublicUrl}/reset-password?token=${rawToken}`;
    await emailSender.sendPasswordResetEmail(user.email, resetUrl);

    return {};
  };
}
