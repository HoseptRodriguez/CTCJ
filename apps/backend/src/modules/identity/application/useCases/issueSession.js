import { randomUUID } from 'node:crypto';

/**
 * Opens a session (access token + a new refresh-token family) for a person
 * whose identity is already fully checked: password, and the second step
 * when they have two-step verification.
 *
 * @param {{
 *   tokenService: import('../ports/TokenService.js').TokenService,
 *   refreshTokenRepository: import('../ports/RefreshTokenRepository.js').RefreshTokenRepository,
 *   clock: import('../ports/Clock.js').Clock,
 *   refreshTokenTtlMs: number,
 * }} deps
 */
export function createIssueSession({
  tokenService,
  refreshTokenRepository,
  clock,
  refreshTokenTtlMs,
}) {
  /** @param {import('../../domain/entities/User.js').User} user */
  return async function issueSession(user, { ip = null, userAgent = null } = {}) {
    const now = clock.now();
    const roleCodes = user.listRoleCodes();
    const { token: accessToken, expiresInSeconds } = tokenService.issueAccessToken(
      user.id,
      roleCodes,
    );
    const rawRefreshToken = tokenService.generateRefreshToken();
    const refreshTokenExpiresAt = new Date(now.getTime() + refreshTokenTtlMs);
    await refreshTokenRepository.create(
      user.id,
      tokenService.hashRefreshToken(rawRefreshToken),
      randomUUID(),
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
