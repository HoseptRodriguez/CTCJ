import { Router } from 'express';
import {
  createPlanSchema,
  setPlanPriceSchema,
  enrollPlayerSchema,
  setPlayerMembershipStatusSchema,
  addAdjustmentSchema,
  listMembershipsQuerySchema,
  generateInvoiceSchema,
  recordInvoicePaymentSchema,
  cancelInvoiceSchema,
  listInvoicesQuerySchema,
  invoicesMonthlyQuerySchema,
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

  router.post(
    '/memberships/:id/invoices',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(generateInvoiceSchema),
    controller.generateInvoice,
  );
  router.get(
    '/memberships/:id/invoices',
    requireAuth,
    requireRole(STAFF_ROLES),
    controller.listInvoicesByMembership,
  );
  router.get(
    '/invoices',
    requireAuth,
    requireRole(STAFF_ROLES),
    validateQuery(listInvoicesQuerySchema),
    controller.listInvoices,
  );
  router.get(
    '/invoices/monthly',
    requireAuth,
    requireRole(STAFF_ROLES),
    validateQuery(invoicesMonthlyQuerySchema),
    controller.getMonthlyRevenue,
  );
  router.get('/invoices/:id', requireAuth, requireRole(STAFF_ROLES), controller.getInvoice);
  router.post(
    '/invoices/:id/payment',
    requireAuth,
    requireRole(STAFF_ROLES),
    validateBody(recordInvoicePaymentSchema),
    controller.recordInvoicePayment,
  );
  router.post(
    '/invoices/:id/cancel',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(cancelInvoiceSchema),
    controller.cancelInvoice,
  );

  return router;
}
