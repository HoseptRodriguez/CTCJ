import { Router } from 'express';
import {
  holdSchema,
  confirmSchema,
  scheduleQuerySchema,
  setCourtPriceSchema,
  recordPaymentSchema,
  listPaymentsQuerySchema,
  overduePolicySchema,
  ROLE_CODES,
} from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { optionalAuth } from '../../../identity/infrastructure/http/middleware/optionalAuth.js';
import { requireRole } from '../../../identity/infrastructure/http/middleware/requireRole.js';

import { validateBody, validateQuery } from './validators/bookingValidators.js';

/** @param {ReturnType<import('./bookingController.js').createBookingController>} controller */
export function createBookingRoutes(controller) {
  const router = Router();

  router.get('/courts', controller.listCourts);
  router.get('/schedule', optionalAuth, validateQuery(scheduleQuerySchema), controller.getSchedule);
  router.post('/hold', requireAuth, validateBody(holdSchema), controller.hold);
  router.post('/confirm', requireAuth, validateBody(confirmSchema), controller.confirm);
  router.post('/:id/cancel', requireAuth, controller.cancel);

  router.put(
    '/courts/:id/price',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(setCourtPriceSchema),
    controller.setCourtPrice,
  );
  router.post(
    '/:id/payment',
    requireAuth,
    requireRole([ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION]),
    validateBody(recordPaymentSchema),
    controller.recordPayment,
  );

  router.get(
    '/payments',
    requireAuth,
    requireRole([ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION]),
    validateQuery(listPaymentsQuerySchema),
    controller.listPayments,
  );

  router.get(
    '/settings/overdue-policy',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    controller.getOverduePolicy,
  );
  router.put(
    '/settings/overdue-policy',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(overduePolicySchema),
    controller.setOverduePolicy,
  );

  return router;
}
