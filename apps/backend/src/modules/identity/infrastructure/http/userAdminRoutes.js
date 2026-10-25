import { Router } from 'express';
import {
  setMembershipStatusSchema,
  setUserDocumentSchema,
  lookupUserQuerySchema,
  ROLE_CODES,
} from '@ctcj/shared';

import { requireAuth } from './middleware/requireAuth.js';
import { requireRole } from './middleware/requireRole.js';
import { validateBody, validateQuery } from './validators/authValidators.js';

/** @param {ReturnType<import('./userAdminController.js').createUserAdminController>} controller */
export function createUserAdminRoutes(controller) {
  const router = Router();

  router.get(
    '/lookup',
    requireAuth,
    // Phase 10: coaches need this too, to look up a player before writing a
    // note about them. Returns only public-ish identity fields -- no
    // financial/clinical data -- so widening it here is safe.
    requireRole([ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION, ROLE_CODES.ENTRENADOR]),
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

  router.get(
    '/counts',
    requireAuth,
    requireRole([ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION]),
    controller.getPlayerCounts,
  );

  // Identity document: optional, filled by reception only when needed.
  router.get(
    '/:id/document',
    requireAuth,
    requireRole([ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION]),
    controller.getDocument,
  );
  router.put(
    '/:id/document',
    requireAuth,
    requireRole([ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION]),
    validateBody(setUserDocumentSchema),
    controller.setDocument,
  );

  return router;
}
