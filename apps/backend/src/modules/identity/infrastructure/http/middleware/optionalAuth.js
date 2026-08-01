import jwt from 'jsonwebtoken';

import { config } from '../../../../../config/env.js';

/**
 * Like requireAuth, but never rejects: attaches req.user if a valid Bearer
 * token is present, otherwise proceeds as anonymous. For routes (like the
 * booking schedule) that must work for both anonymous and authenticated
 * callers, projecting different detail based on who's asking.
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    req.user = { id: payload.sub, roles: payload.roles ?? [] };
  } catch {
    // Invalid/expired token on an optional-auth route: treat as anonymous
    // rather than rejecting the request.
  }
  return next();
}
