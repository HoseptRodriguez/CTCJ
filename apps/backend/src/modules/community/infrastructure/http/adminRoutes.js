import { Router } from 'express';
import { listReportedContentQuerySchema, ROLE_CODES } from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { requireRole } from '../../../identity/infrastructure/http/middleware/requireRole.js';

import { validateQuery } from './validators/communityValidators.js';

const STAFF_ROLES = [ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION];

/** @param {ReturnType<import('./adminController.js').createAdminController>} controller */
export function createAdminRoutes(controller) {
  const router = Router();

  router.get(
    '/reports',
    requireAuth,
    requireRole(STAFF_ROLES),
    validateQuery(listReportedContentQuerySchema),
    controller.listReports,
  );
  router.post(
    '/reports/:id/dismiss',
    requireAuth,
    requireRole(STAFF_ROLES),
    controller.dismissReport,
  );
  router.delete('/posts/:id', requireAuth, requireRole(STAFF_ROLES), controller.deletePost);
  router.delete('/comments/:id', requireAuth, requireRole(STAFF_ROLES), controller.deleteComment);

  return router;
}
