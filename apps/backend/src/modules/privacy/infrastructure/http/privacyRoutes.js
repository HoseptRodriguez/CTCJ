import { Router } from 'express';
import { ROLE_CODES, answerDataRequestSchema, submitDataRequestSchema } from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { requireRole } from '../../../identity/infrastructure/http/middleware/requireRole.js';

import { validateBody } from './validators/privacyValidators.js';

/** The person's own data: /api/privacy/me/... */
export function createPrivacyMeRoutes(controller) {
  const router = Router();
  router.get('/export', requireAuth, controller.exportMyData);
  router.get('/requests', requireAuth, controller.listMyDataRequests);
  router.post(
    '/requests',
    requireAuth,
    validateBody(submitDataRequestSchema),
    controller.submitDataRequest,
  );
  return router;
}

/** The club's inbox: /api/admin/privacy/... (administration only). */
export function createPrivacyAdminRoutes(controller) {
  const router = Router();
  const adminOnly = [requireAuth, requireRole(ROLE_CODES.ADMINISTRADOR)];
  router.get('/requests', ...adminOnly, controller.listDataRequests);
  router.post(
    '/requests/:id/answer',
    ...adminOnly,
    validateBody(answerDataRequestSchema),
    controller.answerDataRequest,
  );
  return router;
}
