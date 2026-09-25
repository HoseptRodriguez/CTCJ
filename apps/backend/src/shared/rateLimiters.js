import expressRateLimit from 'express-rate-limit';

import { config } from '../config/env.js';

/**
 * express-rate-limit correctness depends on req.ip being the real client
 * address, which in turn depends on `trust proxy` being set correctly
 * (see app.js) -- without it every request behind Render's proxy would
 * share one IP and either all share one bucket or all bypass the limit.
 *
 * Disabled entirely under test: integration tests fire dozens of requests
 * at these routes from the same supertest agent in one run (see
 * authHttp.test.js), which would otherwise trip the limit and fail tests
 * that have nothing to do with brute-force protection.
 */
function createLimiter({ windowMs, max, message }) {
  if (config.isTest) {
    return (_req, _res, next) => next();
  }
  return expressRateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { type: 'https://ctcj.co/errors/rate_limited', title: message, status: 429 },
  });
}

// Credential guessing surface: kept tight.
export const loginRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again later.',
});

// Mass account creation is cheaper to abuse than login guessing, but a
// shared office/campus IP shouldn't get blocked from signing up entirely.
export const registerRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many accounts created from this address. Please try again later.',
});

// Covers both password-reset endpoints: request (email enumeration/spam)
// and confirm (token guessing) share the same abuse shape and limit.
export const passwordResetRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many password reset attempts. Please try again later.',
});
