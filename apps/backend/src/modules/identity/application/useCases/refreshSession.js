import { isMfaRequiredFor } from '@ctcj/shared';

import { InvalidRefreshToken } from '../errors/InvalidRefreshToken.js';
import { MfaSetupRequired } from '../errors/MfaSetupRequired.js';

/**
 * @param {{
 *   refreshTokenRepository: import('../ports/RefreshTokenRepository.js').RefreshTokenRepository,
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   tokenService: import('../ports/TokenService.js').TokenService,
 *   clock: import('../ports/Clock.js').Clock,
 *   refreshTokenTtlMs: number,
 *   mfaRepository?: import('../ports/MfaRepository.js').MfaRepository,
 *   mfaEnforced?: boolean,
 * }} deps
 */
export function createRefreshSession({
  refreshTokenRepository,
  userRepository,
  tokenService,
  clock,
  refreshTokenTtlMs,
  mfaRepository,
  mfaEnforced = false,
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
    // Deactivated while signed in: the session ends here, for good.
    if (!user.canSignIn()) {
      await refreshTokenRepository.revokeFamily(record.familyId);
      throw new InvalidRefreshToken();
    }

    // A role that requires two-step verification and doesn't have it (an old
    // session, or an Administración reset) must sign in again and turn it on.
    if (mfaEnforced && mfaRepository && isMfaRequiredFor(user.listRoleCodes())) {
      const mfa = await mfaRepository.getState(user.id);
      if (!mfa.enabled) {
        await refreshTokenRepository.revokeFamily(record.familyId);
        throw new MfaSetupRequired();
      }
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
