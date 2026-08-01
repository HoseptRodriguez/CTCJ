import { randomUUID } from 'node:crypto';

import { User } from '../../domain/entities/User.js';
import { InvalidCredentials } from '../../domain/errors/InvalidCredentials.js';
import { AccountLockedError } from '../../domain/errors/AccountLockedError.js';

/**
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   passwordHasher: import('../ports/PasswordHasher.js').PasswordHasher,
 *   tokenService: import('../ports/TokenService.js').TokenService,
 *   refreshTokenRepository: import('../ports/RefreshTokenRepository.js').RefreshTokenRepository,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 *   refreshTokenTtlMs: number,
 * }} deps
 */
export function createLoginUser({
  userRepository,
  passwordHasher,
  tokenService,
  refreshTokenRepository,
  clock,
  clubId,
  refreshTokenTtlMs,
}) {
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

    user.recordSuccessfulLogin(now);
    await userRepository.update(user);

    const roleCodes = user.listRoleCodes();
    const { token: accessToken, expiresInSeconds } = tokenService.issueAccessToken(
      user.id,
      roleCodes,
    );

    const rawRefreshToken = tokenService.generateRefreshToken();
    const refreshTokenHash = tokenService.hashRefreshToken(rawRefreshToken);
    const familyId = randomUUID();
    const refreshTokenExpiresAt = new Date(now.getTime() + refreshTokenTtlMs);
    await refreshTokenRepository.create(
      user.id,
      refreshTokenHash,
      familyId,
      refreshTokenExpiresAt,
      ip,
      userAgent,
    );

    return {
      accessToken,
      expiresInSeconds,
      refreshToken: rawRefreshToken,
      refreshTokenExpiresAt,
      roles: roleCodes,
    };
  };
}
