import { beforeEach, describe, expect, it } from 'vitest';

import { createLogoutUser } from '../../../../src/modules/identity/application/useCases/logoutUser.js';

import { createFakeRefreshTokenRepository, createFakeTokenService } from './fakes.js';

function buildDeps() {
  return {
    refreshTokenRepository: createFakeRefreshTokenRepository(),
    tokenService: createFakeTokenService(),
  };
}

describe('logoutUser', () => {
  let deps;
  let logoutUser;

  beforeEach(() => {
    deps = buildDeps();
    logoutUser = createLogoutUser(deps);
  });

  it('revokes the refresh token so it can no longer be used', async () => {
    const rawToken = deps.tokenService.generateRefreshToken();
    const tokenHash = deps.tokenService.hashRefreshToken(rawToken);
    await deps.refreshTokenRepository.create(
      'user-1',
      tokenHash,
      'family-1',
      new Date(Date.now() + 1000),
    );

    await logoutUser({ rawRefreshToken: rawToken });

    const record = await deps.refreshTokenRepository.findByHash(tokenHash);
    expect(record.revokedAt).not.toBeNull();
  });

  it('is a no-op when no refresh token is provided', async () => {
    await expect(logoutUser({ rawRefreshToken: undefined })).resolves.toBeUndefined();
  });

  it('is a no-op for an unknown token (no error thrown)', async () => {
    await expect(logoutUser({ rawRefreshToken: 'unknown' })).resolves.toBeUndefined();
  });
});
