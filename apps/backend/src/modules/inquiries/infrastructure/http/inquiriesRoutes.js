import { Router } from 'express';
import {
  ROLE_CODES,
  infoRequestListQuerySchema,
  infoRequestNoteSchema,
  infoRequestSchema,
  infoRequestStatusSchema,
} from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { requireRole } from '../../../identity/infrastructure/http/middleware/requireRole.js';
import { infoRequestRateLimiter } from '../../../../shared/rateLimiters.js';

import { validateBody, validateQuery } from './validators/inquiriesValidators.js';

/** Public: /api/info-requests */
export function createPublicInquiriesRoutes(controller) {
  const router = Router();
  router.get('/form-token', controller.formToken);
  router.post('/', infoRequestRateLimiter, validateBody(infoRequestSchema), controller.submit);
  return router;
}

/** Staff inbox: /api/admin/info-requests (Administración y Recepción). */
export function createAdminInquiriesRoutes(controller) {
  const router = Router();
  const desk = [requireAuth, requireRole([ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION])];
  router.get('/', ...desk, validateQuery(infoRequestListQuerySchema), controller.list);
  router.get('/count-new', ...desk, controller.countNew);
  router.put('/:id/status', ...desk, validateBody(infoRequestStatusSchema), controller.setStatus);
  router.post('/:id/notes', ...desk, validateBody(infoRequestNoteSchema), controller.addNote);
  return router;
}
