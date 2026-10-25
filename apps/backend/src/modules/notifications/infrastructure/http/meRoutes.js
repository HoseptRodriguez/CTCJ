import { notificationPreferencesSchema } from '@ctcj/shared';
import { Router } from 'express';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';

import { validateBody } from './validators/notificationValidators.js';

/** @param {ReturnType<import('./meController.js').createMeController>} controller */
export function createMeRoutes(controller) {
  const router = Router();

  router.get('/', requireAuth, controller.listMyNotifications);
  router.get('/preferences', requireAuth, controller.getPreferences);
  router.put(
    '/preferences',
    requireAuth,
    validateBody(notificationPreferencesSchema),
    controller.updatePreferences,
  );
  router.get('/news', requireAuth, controller.listNews);
  router.post('/:id/read', requireAuth, controller.markNotificationRead);
  router.post('/read-all', requireAuth, controller.markAllNotificationsRead);

  return router;
}
