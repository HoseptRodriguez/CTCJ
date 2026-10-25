import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../src/app.js';

/**
 * Security headers on every response (Parte 8). The session cookie's flags
 * (HttpOnly, Secure in production, SameSite=Strict, Path=/api/auth) are
 * checked in identity/authHttp.test.js.
 */
describe('security headers', () => {
  const app = createApp();

  it('CSP, HSTS, nosniff, referrer and permissions policies, no framing', async () => {
    const res = await request(app).get('/health').expect(200);
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("font-src 'self' data:");
    expect(csp).not.toMatch(/font-src[^;]*https:/);
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['permissions-policy']).toContain('camera=()');
    expect(res.headers['permissions-policy']).toContain('geolocation=()');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
