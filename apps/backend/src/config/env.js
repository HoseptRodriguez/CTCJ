import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  REFRESH_COOKIE_NAME: z.string().min(1).default('ctcj_refresh'),

  SMTP_HOST: z.string().min(1).default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM: z.string().min(1).default('CTCJ <no-reply@ctcj.local>'),

  APP_PUBLIC_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration. See errors above.');
}

/**
 * Single validated source of truth for process.env. No other module should
 * read process.env directly (enforced by the no-restricted-properties ESLint rule).
 */
export const config = Object.freeze({
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',

  databaseUrl: parsed.data.DATABASE_URL,

  jwt: Object.freeze({
    accessSecret: parsed.data.JWT_ACCESS_SECRET,
    accessTtlSeconds: parsed.data.JWT_ACCESS_TTL_SECONDS,
  }),

  refreshToken: Object.freeze({
    ttlDays: parsed.data.REFRESH_TOKEN_TTL_DAYS,
    cookieName: parsed.data.REFRESH_COOKIE_NAME,
  }),

  smtp: Object.freeze({
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    user: parsed.data.SMTP_USER,
    password: parsed.data.SMTP_PASSWORD,
    from: parsed.data.SMTP_FROM,
  }),

  appPublicUrl: parsed.data.APP_PUBLIC_URL,
  corsOrigin: parsed.data.CORS_ORIGIN,
});
