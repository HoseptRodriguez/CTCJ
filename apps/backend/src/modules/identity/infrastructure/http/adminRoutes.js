import { Router } from 'express';
import { grantRoleSchema, ROLE_CODES } from '@ctcj/shared';

import { requireAuth } from './middleware/requireAuth.js';
import { requireRole } from './middleware/requireRole.js';
import { validateBody } from './validators/authValidators.js';

/** @param {ReturnType<import('./roleAdminController.js').createRoleAdminController>} controller */
export function createRoleAdminRoutes(controller) {
  const router = Router();

  router.post(
    '/grant',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(grantRoleSchema),
    controller.grant,
  );

  return router;
}
