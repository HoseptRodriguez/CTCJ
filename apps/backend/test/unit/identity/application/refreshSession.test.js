import { beforeEach, describe, expect, it } from 'vitest';

import { createRefreshSession } from '../../../../src/modules/identity/application/useCases/refreshSession.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { InvalidRefreshToken } from '../../../../src/modules/identity/application/errors/InvalidRefreshToken.js';

import {
  createFakeUserRepository,
  createFakeRefreshTokenRepository,
  createFakeTokenService,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-08-01T10:00:00Z');
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

async function seedUserWithRefreshToken(userRepository, refreshTokenRepository, tokenService) {
  const user = User.registerPublic({
    id: 'user-1',
    clubId: 'club-1',
    email: 'jugador@example.com',
    passwordHash: 'hashed:x',
    firstName: 'Ana',
    lastName: 'Gomez',
  });
  user.verifyEmail(NOW);
  await userRepository.create(user);

  const rawToken = tokenService.generateRefreshToken();
  const tokenHash = tokenService.hashRefreshToken(rawToken);
  await refreshTokenRepository.create(
    user.id,
    tokenHash,
    'family-1',
    new Date(NOW.getTime() + TTL_MS),
    '127.0.0.1',
    'vitest',
  );
  return rawToken;
}

function buildDeps() {
  const clock = createFakeClock(NOW);
  return {
    userRepository: createFakeUserRepository(),
    refreshTokenRepository: createFakeRefreshTokenRepository(),
    tokenService: createFakeTokenService(),
    clock,
    refreshTokenTtlMs: TTL_MS,
  };
}

describe('refreshSession', () => {
  let deps;
  let refreshSession;

  beforeEach(() => {
    deps = buildDeps();
    refreshSession = createRefreshSession(deps);
  });

  it('rotates the token: issues a new access + refresh token pair', async () => {
    const rawToken = await seedUserWithRefreshToken(
      deps.userRepository,
      deps.refreshTokenRepository,
      deps.tokenService,
    );

    const result = await refreshSession({
      rawRefreshToken: rawToken,
      ip: '127.0.0.1',
      userAgent: 'vitest',
    });

    expect(result.accessToken).toContain('user-1');
    expect(result.refreshToken).not.toBe(rawToken);
  });

  it('marks the old token as replaced and keeps the same family', async () => {
    const rawToken = await seedUserWithRefreshToken(
      deps.userRepository,
      deps.refreshTokenRepository,
      deps.tokenService,
    );
    const oldHash = deps.tokenService.hashRefreshToken(rawToken);
    const oldRecordBefore = await deps.refreshTokenRepository.findByHash(oldHash);
    expect(oldRecordBefore.replacedBy).toBeNull();

    const result = await refreshSession({ rawRefreshToken: rawToken });

    const oldRecordAfter = await deps.refreshTokenRepository.findByHash(oldHash);
    expect(oldRecordAfter.replacedBy).not.toBeNull();

    const newHash = deps.tokenService.hashRefreshToken(result.refreshToken);
    const newRecord = await deps.refreshTokenRepository.findByHash(newHash);
    expect(newRecord.familyId).toBe(oldRecordAfter.familyId);
  });

  it('rejects an unknown token', async () => {
    await expect(refreshSession({ rawRefreshToken: 'not-a-real-token' })).rejects.toThrow(
      InvalidRefreshToken,
    );
  });

  it('reuse of an already-rotated token revokes the entire family', async () => {
    const rawToken = await seedUserWithRefreshToken(
      deps.userRepository,
      deps.refreshTokenRepository,
      deps.tokenService,
    );

    // First refresh: legitimate rotation.
    const first = await refreshSession({ rawRefreshToken: rawToken });

    // Replaying the now-rotated-out original token: reuse/theft signal.
    await expect(refreshSession({ rawRefreshToken: rawToken })).rejects.toThrow(
      InvalidRefreshToken,
    );

    // The family is now fully revoked, so even the legitimately-rotated
    // successor token must also be rejected.
    await expect(refreshSession({ rawRefreshToken: first.refreshToken })).rejects.toThrow(
      InvalidRefreshToken,
    );
  });

  it('rejects an expired token without revoking the family', async () => {
    const rawToken = await seedUserWithRefreshToken(
      deps.userRepository,
      deps.refreshTokenRepository,
      deps.tokenService,
    );
    deps.clock.advanceMs(TTL_MS + 1000);

    await expect(refreshSession({ rawRefreshToken: rawToken })).rejects.toThrow(
      InvalidRefreshToken,
    );
  });
});
