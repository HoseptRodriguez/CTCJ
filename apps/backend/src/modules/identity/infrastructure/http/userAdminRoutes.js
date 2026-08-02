import { Router } from 'express';
import { setMembershipStatusSchema, lookupUserQuerySchema, ROLE_CODES } from '@ctcj/shared';

import { requireAuth } from './middleware/requireAuth.js';
import { requireRole } from './middleware/requireRole.js';
import { validateBody, validateQuery } from './validators/authValidators.js';

/** @param {ReturnType<import('./userAdminController.js').createUserAdminController>} controller */
export function createUserAdminRoutes(controller) {
  const router = Router();

  router.get(
    '/lookup',
    requireAuth,
    requireRole([ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION]),
    validateQuery(lookupUserQuerySchema),
    controller.lookup,
  );

  router.put(
    '/:id/membership-status',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(setMembershipStatusSchema),
    controller.setMembershipStatus,
  );

  return router;
}
