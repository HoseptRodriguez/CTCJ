import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { createJwtTokenService } from '../../../src/modules/identity/infrastructure/security/jwtTokenService.js';

const SECRET = 'test-secret-not-for-production-use-only-in-vitest-runs';

describe('jwtTokenService (real jsonwebtoken + crypto)', () => {
  const service = createJwtTokenService({ accessSecret: SECRET, accessTtlSeconds: 900 });

  it('issues an access token with only {sub, roles, iat, exp} claims (no PII)', () => {
    const { token, expiresInSeconds } = service.issueAccessToken('user-1', ['USUARIO', 'JUGADOR']);
    expect(expiresInSeconds).toBe(900);

    const decoded = jwt.verify(token, SECRET);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.roles).toEqual(['USUARIO', 'JUGADOR']);
    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'roles', 'sub']);
  });

  it('rejects a token signed with a different secret', () => {
    const { token } = service.issueAccessToken('user-1', ['USUARIO']);
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });

  it('generateRefreshToken() produces distinct opaque values, not JWTs', () => {
    const a = service.generateRefreshToken();
    const b = service.generateRefreshToken();
    expect(a).not.toBe(b);
    expect(a.split('.')).toHaveLength(1); // not a JWT (no dot-separated segments)
  });

  it('hashRefreshToken() is deterministic and never returns the raw value', () => {
    const raw = service.generateRefreshToken();
    const hashA = service.hashRefreshToken(raw);
    const hashB = service.hashRefreshToken(raw);
    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(raw);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/); // hex-encoded SHA-256
  });

  it('generateOpaqueToken()/hashOpaqueToken() behave the same way for verification links', () => {
    const raw = service.generateOpaqueToken();
    const hash = service.hashOpaqueToken(raw);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(raw);
  });
});
