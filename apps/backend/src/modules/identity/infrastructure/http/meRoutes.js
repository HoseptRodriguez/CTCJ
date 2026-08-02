import { Router } from 'express';

import { requireAuth } from './middleware/requireAuth.js';

/** @param {ReturnType<import('./meController.js').createMeController>} controller */
export function createMeRoutes(controller) {
  const router = Router();

  router.get('/membership-status', requireAuth, controller.getMembershipStatus);

  return router;
}
