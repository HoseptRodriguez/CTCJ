import pino from 'pino';

import { config } from '../config/env.js';

export const logger = pino({
  level: config.isTest ? 'silent' : config.isProduction ? 'info' : 'debug',
  transport: config.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
});

/**
 * pino-http options. By default pino-http logs every request's headers --
 * the `authorization` bearer token and the `cookie` with the refresh token --
 * and the full URL, which can carry a one-time token
 * (`/api/auth/verify-email?token=...`). Request logs keep only what
 * diagnosing needs: method, path without the query string, status and
 * timing. No headers, no IP, no body.
 */
export const httpLogOptions = {
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      path: String(req.url ?? '').split('?')[0],
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  // Defense in depth, in case something logs a raw request or response.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'headers.authorization',
      'headers.cookie',
    ],
    censor: '[oculto]',
  },
};

/**
 * What an unexpected error leaves in the logs. A database (Prisma) error's
 * message can repeat the query's values -- for a clinical note, health data
 * -- so only its class, code and the columns involved are kept. Other
 * errors keep their message and stack (the code's own text, no user data).
 */
export function errorForLog(err) {
  if (!err || typeof err !== 'object') return { message: String(err) };
  const isPrisma = typeof err.name === 'string' && err.name.startsWith('Prisma');
  if (isPrisma) {
    return {
      type: err.name,
      code: err.code,
      target: err.meta?.target ?? err.meta?.field_name ?? undefined,
    };
  }
  return { type: err.name, message: err.message, stack: err.stack };
}
