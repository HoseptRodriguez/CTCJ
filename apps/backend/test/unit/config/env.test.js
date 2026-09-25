import { describe, expect, it } from 'vitest';

import { parseEnv } from '../../../src/config/env.js';

const BASE = {
  DATABASE_URL: 'postgresql://ctcj:pw@localhost:5432/ctcj_dev',
  JWT_ACCESS_SECRET: 'a-long-enough-test-secret',
};

const PRODUCTION = {
  ...BASE,
  NODE_ENV: 'production',
  RESEND_API_KEY: 're_test_key',
  MAIL_FROM: 'CTCJ <no-reply@ctcj.co>',
  BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_test',
  APP_PUBLIC_URL: 'https://ctcj.co',
};

describe('parseEnv', () => {
  it('boots in development without any email/blob config (Mailhog + local disk)', () => {
    const config = parseEnv({ ...BASE, NODE_ENV: 'development' });
    expect(config.smtp.host).toBe('localhost');
    expect(config.smtp.port).toBe(1025);
    expect(config.resend.apiKey).toBe('');
    expect(config.blob.readWriteToken).toBe('');
  });

  it('boots in production when Resend and Blob are configured', () => {
    const config = parseEnv(PRODUCTION);
    expect(config.isProduction).toBe(true);
    expect(config.resend).toEqual({ apiKey: 're_test_key', from: 'CTCJ <no-reply@ctcj.co>' });
    expect(config.blob.readWriteToken).toBe('vercel_blob_rw_test');
  });

  it.each(['RESEND_API_KEY', 'MAIL_FROM', 'BLOB_READ_WRITE_TOKEN'])(
    'refuses to boot in production without %s, naming the variable',
    (key) => {
      const env = { ...PRODUCTION };
      delete env[key];
      expect(() => parseEnv(env)).toThrow(new RegExp(`${key}: .*required in production`));
    },
  );

  it('refuses to boot in production when APP_PUBLIC_URL is unset (localhost default)', () => {
    const env = { ...PRODUCTION };
    delete env.APP_PUBLIC_URL;
    expect(() => parseEnv(env)).toThrow(/APP_PUBLIC_URL: .*required in production.*not localhost/);
  });

  it.each([
    'http://localhost:5173',
    'https://ctcj.localhost',
    'http://127.0.0.1:3000',
    'http://0.0.0.0',
    'http://[::1]:5173',
  ])('refuses to boot in production when APP_PUBLIC_URL is local (%s)', (url) => {
    expect(() => parseEnv({ ...PRODUCTION, APP_PUBLIC_URL: url })).toThrow(/APP_PUBLIC_URL/);
  });

  it('accepts a localhost APP_PUBLIC_URL outside production', () => {
    expect(parseEnv({ ...BASE, NODE_ENV: 'development' }).appPublicUrl).toBe(
      'http://localhost:5173',
    );
  });

  it('does not mistake a public host containing "localhost" for a local one', () => {
    expect(
      parseEnv({ ...PRODUCTION, APP_PUBLIC_URL: 'https://localhost-club.co' }).appPublicUrl,
    ).toBe('https://localhost-club.co');
  });

  it('treats a whitespace-only value as missing in production', () => {
    expect(() => parseEnv({ ...PRODUCTION, RESEND_API_KEY: '   ' })).toThrow(/RESEND_API_KEY/);
  });

  it('lists every missing production variable at once', () => {
    let message = '';
    try {
      parseEnv({ ...BASE, NODE_ENV: 'production' });
    } catch (err) {
      message = err.message;
    }
    expect(message).toContain('RESEND_API_KEY');
    expect(message).toContain('MAIL_FROM');
    expect(message).toContain('BLOB_READ_WRITE_TOKEN');
    expect(message).toContain('APP_PUBLIC_URL');
  });
});
