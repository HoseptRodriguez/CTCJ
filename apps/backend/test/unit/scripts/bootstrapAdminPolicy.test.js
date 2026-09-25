import { describe, expect, it } from 'vitest';

import {
  authorizeBootstrap,
  checkBootstrapTarget,
  parseBootstrapArgs,
} from '../../../scripts/bootstrapAdminPolicy.js';

const TOKEN = 'a-very-long-bootstrap-secret-123';

function authorize(argv, { isProduction = true, bootstrapToken = TOKEN } = {}) {
  return authorizeBootstrap({ isProduction, bootstrapToken, args: parseBootstrapArgs(argv) });
}

describe('parseBootstrapArgs', () => {
  it('reads the email (normalized), --confirm and --token in either form', () => {
    expect(parseBootstrapArgs([' Admin@Example.com ', '--confirm', '--token', 'x'])).toEqual({
      email: 'admin@example.com',
      confirm: true,
      token: 'x',
    });
    expect(parseBootstrapArgs(['--token=y', 'a@b.co']).token).toBe('y');
  });
});

describe('authorizeBootstrap', () => {
  it('requires an email everywhere', () => {
    expect(authorize([], { isProduction: false }).ok).toBe(false);
  });

  it('keeps the email-only behaviour in development', () => {
    expect(authorize(['a@b.co'], { isProduction: false, bootstrapToken: '' })).toEqual({
      ok: true,
    });
  });

  it('allows production with --confirm and a --token matching BOOTSTRAP_TOKEN', () => {
    expect(authorize(['a@b.co', '--confirm', '--token', TOKEN])).toEqual({ ok: true });
  });

  it('refuses production without --confirm', () => {
    const result = authorize(['a@b.co', '--token', TOKEN]);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/--confirm/);
  });

  it('refuses production when BOOTSTRAP_TOKEN is unset or too short', () => {
    expect(
      authorize(['a@b.co', '--confirm', '--token', ''], { bootstrapToken: '' }).reason,
    ).toMatch(/BOOTSTRAP_TOKEN must be set/);
    expect(
      authorize(['a@b.co', '--confirm', '--token', 'short'], { bootstrapToken: 'short' }).reason,
    ).toMatch(/at least 24/);
  });

  it('refuses production when --token is missing or does not match', () => {
    expect(authorize(['a@b.co', '--confirm']).reason).toMatch(/does not match/);
    expect(authorize(['a@b.co', '--confirm', '--token', `${TOKEN}x`]).reason).toMatch(
      /does not match/,
    );
    expect(authorize(['a@b.co', '--confirm', '--token', TOKEN.toUpperCase()]).ok).toBe(false);
  });
});

describe('checkBootstrapTarget', () => {
  it('accepts an existing, verified, ACTIVE account', () => {
    expect(
      checkBootstrapTarget({ status: 'ACTIVE', emailVerifiedAt: new Date() }, 'a@b.co'),
    ).toBeNull();
  });

  it('refuses a missing account', () => {
    expect(checkBootstrapTarget(null, 'a@b.co')).toMatch(/No user found/);
  });

  it('refuses an account that has not verified its email', () => {
    expect(
      checkBootstrapTarget({ status: 'PENDING_VERIFICATION', emailVerifiedAt: null }, 'a@b.co'),
    ).toMatch(/not verified/);
  });

  it('refuses a verified account that is suspended or deactivated', () => {
    expect(
      checkBootstrapTarget({ status: 'SUSPENDED', emailVerifiedAt: new Date() }, 'a@b.co'),
    ).toMatch(/SUSPENDED/);
  });
});
