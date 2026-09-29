import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),

    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    REFRESH_COOKIE_NAME: z.string().min(1).default('ctcj_refresh'),

    // Dev/test email: SMTP, pointed at Mailhog by default (docker-compose.yml).
    SMTP_HOST: z.string().min(1).default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_USER: z.string().optional().default(''),
    SMTP_PASSWORD: z.string().optional().default(''),
    SMTP_FROM: z.string().min(1).default('CTCJ <no-reply@ctcj.local>'),

    // Production email: Resend. Required when NODE_ENV=production (see
    // superRefine below) -- Mailhog is never a valid production mailer.
    RESEND_API_KEY: z.string().optional().default(''),
    MAIL_FROM: z.string().optional().default(''),

    // Avatar storage: Vercel Blob when set, local disk otherwise. Required
    // in production, where local disk doesn't survive a redeploy.
    BLOB_READ_WRITE_TOKEN: z.string().optional().default(''),

    // Only read by scripts/bootstrapAdmin.js in production.
    BOOTSTRAP_TOKEN: z.string().optional().default(''),

    // Base of the links in verification/password-reset emails. The localhost
    // default only makes sense in development -- see superRefine below.
    // Two-step verification: the key that encrypts the TOTP secrets and
    // hashes the recovery codes (32 bytes, base64). Required in production.
    MFA_ENCRYPTION_KEY: z.string().optional().default(''),
    // Two-step verification is mandatory for Administración, Psicología,
    // Neuropsicología and Fisioterapia. Only tests may turn that off
    // (so the other suites can sign in as staff); never production.
    MFA_ENFORCE_STAFF: z.enum(['true', 'false']).default('true'),

    APP_PUBLIC_URL: z.string().url().default('http://localhost:5173'),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    const requiredInProduction = {
      RESEND_API_KEY: 'RESEND_API_KEY is required in production (email is sent through Resend)',
      MAIL_FROM: 'MAIL_FROM is required in production, e.g. "CTCJ <no-reply@your-domain>"',
      BLOB_READ_WRITE_TOKEN:
        'BLOB_READ_WRITE_TOKEN is required in production (avatars are stored in Vercel Blob)',
    };
    if (!mfaKeyBytes(env.MFA_ENCRYPTION_KEY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MFA_ENCRYPTION_KEY'],
        message:
          'MFA_ENCRYPTION_KEY is required in production: 32 random bytes in base64 ' +
          '(see .env.example for a command that generates one)',
      });
    }
    if (env.MFA_ENFORCE_STAFF !== 'true') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MFA_ENFORCE_STAFF'],
        message: 'Two-step verification for the staff cannot be turned off in production',
      });
    }
    for (const [key, message] of Object.entries(requiredInProduction)) {
      if (!env[key].trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message });
      }
    }
    // Unset falls back to the localhost default, so one check covers both
    // "missing" and "pointing at localhost" -- either way every emailed link
    // would be broken without any error.
    if (isLocalUrl(env.APP_PUBLIC_URL)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APP_PUBLIC_URL'],
        message:
          'APP_PUBLIC_URL is required in production and must be the public site URL, not localhost ' +
          '(it builds the links in verification and password-reset emails)',
      });
    }
  });

/** The MFA key as 32 bytes, or null when missing or of the wrong size. */
export function mfaKeyBytes(value) {
  if (!value) return null;
  const bytes = Buffer.from(value, 'base64');
  return bytes.length === 32 ? bytes : null;
}

// Development and tests without a key get a fixed, public one: secrets
// encrypted with it are NOT protected. Production refuses to start without
// a real key (superRefine above).
const INSECURE_DEV_MFA_KEY = Buffer.alloc(32, 'ctcj-dev-mfa-key-not-for-production');

function isLocalUrl(url) {
  const { hostname } = new URL(url);
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]' ||
    /^127\.\d+\.\d+\.\d+$/.test(hostname)
  );
}

/**
 * Validates an environment object and returns the frozen app config. Throws
 * with every problem listed, so a misconfigured deploy fails at boot with a
 * readable message instead of failing later on the first request.
 *
 * @param {Record<string, string | undefined>} source
 */
export function parseEnv(source) {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const problems = Object.entries(parsed.error.flatten().fieldErrors)
      .map(([key, messages]) => `  - ${key}: ${messages.join('; ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  const env = parsed.data;
  return Object.freeze({
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',

    databaseUrl: env.DATABASE_URL,

    jwt: Object.freeze({
      accessSecret: env.JWT_ACCESS_SECRET,
      accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
    }),

    refreshToken: Object.freeze({
      ttlDays: env.REFRESH_TOKEN_TTL_DAYS,
      cookieName: env.REFRESH_COOKIE_NAME,
    }),

    smtp: Object.freeze({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      from: env.SMTP_FROM,
    }),

    resend: Object.freeze({
      apiKey: env.RESEND_API_KEY,
      from: env.MAIL_FROM,
    }),

    blob: Object.freeze({
      readWriteToken: env.BLOB_READ_WRITE_TOKEN,
    }),

    bootstrapToken: env.BOOTSTRAP_TOKEN,

    mfa: Object.freeze({
      key: mfaKeyBytes(env.MFA_ENCRYPTION_KEY) ?? INSECURE_DEV_MFA_KEY,
      enforceStaff: env.MFA_ENFORCE_STAFF === 'true',
    }),

    appPublicUrl: env.APP_PUBLIC_URL,
    corsOrigin: env.CORS_ORIGIN,
  });
}

/**
 * Single validated source of truth for process.env. No other module should
 * read process.env directly (enforced by the no-restricted-properties ESLint rule).
 */
export const config = parseEnv(process.env);
