import { Router } from 'express';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';

/** @param {ReturnType<import('./meController.js').createMeController>} controller */
export function createMeRoutes(controller) {
  const router = Router();

  router.get('/', requireAuth, controller.listMyNotifications);
  router.post('/:id/read', requireAuth, controller.markNotificationRead);
  router.post('/read-all', requireAuth, controller.markAllNotificationsRead);

  return router;
}
