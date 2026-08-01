/**
 * @param {{
 *   refreshTokenRepository: import('../ports/RefreshTokenRepository.js').RefreshTokenRepository,
 *   tokenService: import('../ports/TokenService.js').TokenService,
 * }} deps
 */
export function createLogoutUser({ refreshTokenRepository, tokenService }) {
  return async function logoutUser({ rawRefreshToken }) {
    if (!rawRefreshToken) {
      return;
    }
    const tokenHash = tokenService.hashRefreshToken(rawRefreshToken);
    const record = await refreshTokenRepository.findByHash(tokenHash);
    if (record && !record.revokedAt) {
      await refreshTokenRepository.revokeById(record.id);
    }
  };
}
