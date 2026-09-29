import { Router } from 'express';
import {
  holdSchema,
  confirmSchema,
  scheduleQuerySchema,
  setCourtPriceSchema,
  recordPaymentSchema,
  listPaymentsQuerySchema,
  paymentsMonthlyQuerySchema,
  overduePolicySchema,
  holdDurationSchema,
  setSecondHourPolicySchema,
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
  // The optional second hour of a held reservation (same court, next hour).
  router.post('/:id/second-hour', requireAuth, controller.addSecondHour);
  router.delete('/:id/second-hour', requireAuth, controller.removeSecondHour);

  router.put(
    '/courts/:id/price',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(setCourtPriceSchema),
    controller.setCourtPrice,
  );
  router.get(
    '/courts/:id/price-history',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    controller.getCourtPriceHistory,
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
    '/payments/monthly',
    requireAuth,
    requireRole([ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION]),
    validateQuery(paymentsMonthlyQuerySchema),
    controller.getMonthlyRevenue,
  );

  router.get('/me/training-frequency', requireAuth, controller.getMyTrainingFrequency);
  router.get('/my-reservations', requireAuth, controller.getMyReservations);
  router.get(
    '/players/:id/reservations',
    requireAuth,
    requireRole([ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION]),
    controller.getPlayerReservations,
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

  // Public: the booking page tells everyone "Confirma en N minutos".
  router.get('/settings/hold-duration', controller.getHoldDuration);
  router.put(
    '/settings/hold-duration',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(holdDurationSchema),
    controller.setHoldDuration,
  );
  // Public: the booking page only offers "+ Agregar otra hora" when it's on.
  router.get('/settings/second-hour', controller.getSecondHourPolicy);
  router.put(
    '/settings/second-hour',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(setSecondHourPolicySchema),
    controller.setSecondHourPolicy,
  );

  return router;
}
