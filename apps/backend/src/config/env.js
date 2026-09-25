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
    for (const [key, message] of Object.entries(requiredInProduction)) {
      if (!env[key].trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message });
      }
    }
  });

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

    appPublicUrl: env.APP_PUBLIC_URL,
    corsOrigin: env.CORS_ORIGIN,
  });
}

/**
 * Single validated source of truth for process.env. No other module should
 * read process.env directly (enforced by the no-restricted-properties ESLint rule).
 */
export const config = parseEnv(process.env);
