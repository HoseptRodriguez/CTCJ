import { Router } from 'express';
import { decideAffiliationRequestSchema, ROLE_CODES } from '@ctcj/shared';

import { requireAuth } from './middleware/requireAuth.js';
import { requireRole } from './middleware/requireRole.js';
import { validateBody } from './validators/authValidators.js';

/** @param {ReturnType<import('./affiliationAdminController.js').createAffiliationAdminController>} controller */
export function createAffiliationAdminRoutes(controller) {
  const router = Router();

  router.get('/', requireAuth, requireRole(ROLE_CODES.ADMINISTRADOR), controller.list);
  router.put(
    '/:id/decision',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(decideAffiliationRequestSchema),
    controller.decide,
  );

  return router;
}
