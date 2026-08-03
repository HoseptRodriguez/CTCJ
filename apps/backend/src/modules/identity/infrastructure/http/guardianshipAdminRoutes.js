import { Router } from 'express';
import { decideGuardianshipSchema, ROLE_CODES } from '@ctcj/shared';

import { requireAuth } from './middleware/requireAuth.js';
import { requireRole } from './middleware/requireRole.js';
import { validateBody } from './validators/authValidators.js';

/** @param {ReturnType<import('./guardianshipAdminController.js').createGuardianshipAdminController>} controller */
export function createGuardianshipAdminRoutes(controller) {
  const router = Router();

  router.get('/', requireAuth, requireRole(ROLE_CODES.ADMINISTRADOR), controller.list);
  router.put(
    '/:id/decision',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(decideGuardianshipSchema),
    controller.decide,
  );

  return router;
}
