import { createHmac, timingSafeEqual } from 'node:crypto';

import express, { Router } from 'express';

import { HttpError } from '../../../../shared/errors/httpError.js';

import { mapNotificationsError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapNotificationsError(err)));
  };
}

/**
 * "Dejar de recibir estos correos": no login, one click. The token is the
 * signed link of the email (body `token`, or `?t=` for the RFC 8058
 * one-click POST that mail apps send by themselves).
 *
 * @param {{ container: object, rateLimiter: import('express').RequestHandler }} deps
 */
export function createUnsubscribeRoutes({ container, rateLimiter }) {
  const router = Router();
  router.post(
    '/',
    rateLimiter,
    express.urlencoded({ extended: false, limit: '2kb' }),
    asyncHandler(async (req, res) => {
      const token = req.body?.token ?? req.query.t;
      if (typeof token !== 'string')
        throw new HttpError(400, 'unsubscribe_link_invalid', 'Missing link');
      res.status(200).json(await container.unsubscribe({ token }));
    }),
  );
  return router;
}

/**
 * Verifies a Resend (Svix) webhook signature: HMAC-SHA256 of
 * "id.timestamp.body" with the base64 secret after "whsec_", within 5
 * minutes. @returns {boolean}
 */
export function verifyResendSignature({
  secret,
  id,
  timestamp,
  signature,
  body,
  now = Date.now(),
}) {
  if (!secret || !id || !timestamp || !signature) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest();
  return signature
    .split(' ')
    .map((part) => part.split(',')[1])
    .filter(Boolean)
    .some((sig) => {
      const given = Buffer.from(sig, 'base64');
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
}

/**
 * Resend webhook (email.opened): marks the delivery as opened. Mounted with
 * its own raw-body parser (the signature covers the exact bytes). Without
 * RESEND_WEBHOOK_SECRET it answers 404: open tracking is simply off.
 *
 * @param {{ container: object, secret: string }} deps
 */
export function createEmailEventsRoute({ container, secret }) {
  return [
    express.raw({ type: 'application/json', limit: '256kb' }),
    asyncHandler(async (req, res) => {
      if (!secret) throw new HttpError(404, 'not_found', 'Not found');
      const body = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
      const ok = verifyResendSignature({
        secret,
        id: req.get('svix-id'),
        timestamp: req.get('svix-timestamp'),
        signature: req.get('svix-signature'),
        body,
      });
      if (!ok) throw new HttpError(401, 'invalid_signature', 'Invalid signature');
      const event = JSON.parse(body);
      if (event?.type === 'email.opened' && event.data?.email_id) {
        await container.markEmailOpened({
          providerMessageId: event.data.email_id,
          openedAt: new Date(event.created_at ?? Date.now()),
        });
      }
      res.status(200).json({ received: true });
    }),
  ];
}
