import { isMfaRequiredFor } from '@ctcj/shared';

import { User } from '../../domain/entities/User.js';
import { InvalidCredentials } from '../../domain/errors/InvalidCredentials.js';
import { AccountLockedError } from '../../domain/errors/AccountLockedError.js';

import { createIssueSession } from './issueSession.js';

/**
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   passwordHasher: import('../ports/PasswordHasher.js').PasswordHasher,
 *   tokenService: import('../ports/TokenService.js').TokenService,
 *   refreshTokenRepository: import('../ports/RefreshTokenRepository.js').RefreshTokenRepository,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 *   refreshTokenTtlMs: number,
 *   mfaRepository?: import('../ports/MfaRepository.js').MfaRepository,
 *   mfaEnforced?: boolean,
 * }} deps
 *
 * With two-step verification on, the password alone doesn't open a
 * session: the result is { mfaRequired, mfaToken } and the second step
 * (completeMfaLogin) opens it. A role that requires it and doesn't have it
 * yet gets { mfaSetupRequired, mfaToken } and must turn it on first.
 */
export function createLoginUser({
  userRepository,
  passwordHasher,
  tokenService,
  refreshTokenRepository,
  clock,
  clubId,
  refreshTokenTtlMs,
  mfaRepository,
  mfaEnforced = false,
}) {
  const issueSession = createIssueSession({
    tokenService,
    refreshTokenRepository,
    clock,
    refreshTokenTtlMs,
  });

  return async function loginUser({ email, password, ip, userAgent }) {
    const normalizedEmail = User.normalizeEmail(email);
    const user = await userRepository.findByEmail(clubId, normalizedEmail);
    if (!user) {
      throw new InvalidCredentials();
    }

    const now = clock.now();
    if (user.isLocked(now)) {
      throw new AccountLockedError(user.lockedUntil);
    }

    const passwordOk = await passwordHasher.verify(password, user.passwordHash);
    if (!passwordOk) {
      user.recordFailedLogin(now);
      await userRepository.update(user);
      throw new InvalidCredentials();
    }

    // Only reachable once the password is confirmed correct, so this never
    // leaks "email not verified" to someone who doesn't already know it.
    user.ensureEmailVerified();
    user.ensureCanSignIn(); // suspended or deactivated by the club

    user.recordSuccessfulLogin(now);
    await userRepository.update(user);

    if (mfaRepository) {
      const mfa = await mfaRepository.getState(user.id);
      if (mfa.enabled) {
        return { mfaRequired: true, mfaToken: tokenService.issueMfaToken(user.id, 'login') };
      }
      if (mfaEnforced && isMfaRequiredFor(user.listRoleCodes())) {
        return { mfaSetupRequired: true, mfaToken: tokenService.issueMfaToken(user.id, 'setup') };
      }
    }

    return issueSession(user, { ip, userAgent });
  };
}
