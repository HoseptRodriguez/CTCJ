import { Router } from 'express';
import { holdSchema, confirmSchema, scheduleQuerySchema } from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { optionalAuth } from '../../../identity/infrastructure/http/middleware/optionalAuth.js';

import { validateBody, validateQuery } from './validators/bookingValidators.js';

/** @param {ReturnType<import('./bookingController.js').createBookingController>} controller */
export function createBookingRoutes(controller) {
  const router = Router();

  router.get('/courts', controller.listCourts);
  router.get('/schedule', optionalAuth, validateQuery(scheduleQuerySchema), controller.getSchedule);
  router.post('/hold', requireAuth, validateBody(holdSchema), controller.hold);
  router.post('/confirm', requireAuth, validateBody(confirmSchema), controller.confirm);
  router.post('/:id/cancel', requireAuth, controller.cancel);

  return router;
}
