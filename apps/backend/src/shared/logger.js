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
