import jwt from 'jsonwebtoken';

import { config } from '../../../../../config/env.js';
import { HttpError } from '../../../../../shared/errors/httpError.js';

/** Verifies the Bearer access token and attaches { id, roles } to req.user. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'unauthenticated', 'Authentication required.'));
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    req.user = { id: payload.sub, roles: payload.roles ?? [] };
    return next();
  } catch {
    return next(new HttpError(401, 'unauthenticated', 'Invalid or expired token.'));
  }
}
