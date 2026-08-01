import { InvalidRefreshToken } from '../errors/InvalidRefreshToken.js';

/**
 * @param {{
 *   refreshTokenRepository: import('../ports/RefreshTokenRepository.js').RefreshTokenRepository,
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   tokenService: import('../ports/TokenService.js').TokenService,
 *   clock: import('../ports/Clock.js').Clock,
 *   refreshTokenTtlMs: number,
 * }} deps
 */
export function createRefreshSession({
  refreshTokenRepository,
  userRepository,
  tokenService,
  clock,
  refreshTokenTtlMs,
}) {
  return async function refreshSession({ rawRefreshToken, ip, userAgent }) {
    const tokenHash = tokenService.hashRefreshToken(rawRefreshToken);
    const record = await refreshTokenRepository.findByHash(tokenHash);
    if (!record) {
      throw new InvalidRefreshToken();
    }

    // A token that was already rotated-out or revoked being presented again
    // is a reuse/theft signal: revoke the whole family, not just this token.
    if (record.revokedAt || record.replacedBy) {
      await refreshTokenRepository.revokeFamily(record.familyId);
      throw new InvalidRefreshToken();
    }

    const now = clock.now();
    if (record.expiresAt < now) {
      throw new InvalidRefreshToken();
    }

    const user = await userRepository.findById(record.userId);
    if (!user) {
      throw new InvalidRefreshToken();
    }

    const newRawToken = tokenService.generateRefreshToken();
    const newTokenHash = tokenService.hashRefreshToken(newRawToken);
    const refreshTokenExpiresAt = new Date(now.getTime() + refreshTokenTtlMs);
    await refreshTokenRepository.rotate(
      record.id,
      newTokenHash,
      refreshTokenExpiresAt,
      ip,
      userAgent,
    );

    const roleCodes = user.listRoleCodes();
    const { token: accessToken, expiresInSeconds } = tokenService.issueAccessToken(
      user.id,
      roleCodes,
    );

    return {
      accessToken,
      expiresInSeconds,
      refreshToken: newRawToken,
      refreshTokenExpiresAt,
    };
  };
}
