import { Router } from 'express';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';

/** @param {ReturnType<import('./meController.js').createMeController>} controller */
export function createMeRoutes(controller) {
  const router = Router();

  router.get('/appointments', requireAuth, controller.getMyAppointments);
  router.get('/notes', requireAuth, controller.getMyNotes);
  router.get('/recovery-plans', requireAuth, controller.getMyRecoveryPlans);
  router.get('/medical-history', requireAuth, controller.getMyMedicalHistory);

  return router;
}
