import { Router } from 'express';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';

/** @param {ReturnType<import('./meController.js').createMeController>} controller */
export function createMeRoutes(controller) {
  const router = Router();

  router.get('/appointments', requireAuth, controller.getMyAppointments);
  router.get('/notes', requireAuth, controller.getMyNotes);

  return router;
}
