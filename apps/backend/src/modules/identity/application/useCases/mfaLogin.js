import { InvalidMfaToken } from '../errors/InvalidMfaToken.js';

import { createIssueSession } from './issueSession.js';

/**
 * The second step of a sign-in, with the short-lived token the first step
 * (password) returned. Only a valid code opens the session.
 *
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   tokenService: import('../ports/TokenService.js').TokenService,
 *   refreshTokenRepository: import('../ports/RefreshTokenRepository.js').RefreshTokenRepository,
 *   clock: import('../ports/Clock.js').Clock,
 *   refreshTokenTtlMs: number,
 *   mfa: ReturnType<typeof import('./mfa.js').createMfaUseCases>,
 * }} deps
 */
export function createMfaLoginUseCases({
  userRepository,
  tokenService,
  refreshTokenRepository,
  clock,
  refreshTokenTtlMs,
  mfa,
}) {
  const issueSession = createIssueSession({
    tokenService,
    refreshTokenRepository,
    clock,
    refreshTokenTtlMs,
  });

  /** The person behind a step token, still allowed to sign in. */
  async function personFor(mfaToken, purpose) {
    const userId = tokenService.verifyMfaToken(mfaToken, purpose);
    if (!userId) throw new InvalidMfaToken();
    const user = await userRepository.findById(userId);
    if (!user) throw new InvalidMfaToken();
    user.ensureCanSignIn(); // deactivated in the meantime
    return user;
  }

  return {
    /**
     * @param {{ mfaToken: string, code?: string, recoveryCode?: string,
     *   ip?: string|null, userAgent?: string|null }} input
     */
    async completeMfaLogin({ mfaToken, code, recoveryCode, ip, userAgent }) {
      const user = await personFor(mfaToken, 'login');
      const result = await mfa.verifyMfaCode({ userId: user.id, code, recoveryCode });
      const session = await issueSession(user, { ip, userAgent });
      return { ...session, ...result };
    },

    /** A role that requires it, turning it on right after the password. */
    async startMfaSetupFromLogin({ mfaToken }) {
      const user = await personFor(mfaToken, 'setup');
      return mfa.startMfaSetup({ userId: user.id });
    },

    /**
     * @param {{ mfaToken: string, code: string, ip?: string|null, userAgent?: string|null }} input
     * @returns the session and the recovery codes (shown once)
     */
    async confirmMfaSetupFromLogin({ mfaToken, code, ip, userAgent }) {
      const user = await personFor(mfaToken, 'setup');
      const { recoveryCodes } = await mfa.confirmMfaSetup({ userId: user.id, code });
      const session = await issueSession(user, { ip, userAgent });
      return { ...session, recoveryCodes };
    },
  };
}
