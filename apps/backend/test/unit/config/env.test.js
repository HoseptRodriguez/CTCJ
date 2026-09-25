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
  });
});
