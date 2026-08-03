import { Router } from 'express';
import {
  createPlanSchema,
  setPlanPriceSchema,
  enrollPlayerSchema,
  setPlayerMembershipStatusSchema,
  addAdjustmentSchema,
  listMembershipsQuerySchema,
  ROLE_CODES,
} from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { requireRole } from '../../../identity/infrastructure/http/middleware/requireRole.js';

import { validateBody, validateQuery } from './validators/billingValidators.js';

const STAFF_ROLES = [ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION];

/** @param {ReturnType<import('./billingAdminController.js').createBillingAdminController>} controller */
export function createBillingAdminRoutes(controller) {
  const router = Router();

  router.get('/plans', requireAuth, requireRole(STAFF_ROLES), controller.listPlans);
  router.post(
    '/plans',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(createPlanSchema),
    controller.createPlan,
  );
  router.get('/plans/:id/prices', requireAuth, requireRole(STAFF_ROLES), controller.listPlanPrices);
  router.put(
    '/plans/:id/price',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(setPlanPriceSchema),
    controller.setPlanPrice,
  );

  router.post(
    '/memberships',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(enrollPlayerSchema),
    controller.enrollPlayer,
  );
  router.get(
    '/memberships',
    requireAuth,
    requireRole(STAFF_ROLES),
    validateQuery(listMembershipsQuerySchema),
    controller.listPlayerMemberships,
  );
  router.put(
    '/memberships/:id/status',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(setPlayerMembershipStatusSchema),
    controller.setPlayerMembershipStatus,
  );
  router.post(
    '/memberships/:id/adjustments',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(addAdjustmentSchema),
    controller.addAdjustment,
  );
  router.get(
    '/memberships/:id/adjustments',
    requireAuth,
    requireRole(STAFF_ROLES),
    controller.listAdjustments,
  );

  return router;
}
