import { ROLE_CODES } from '@ctcj/shared';
import { Router } from 'express';

import { requireAuth } from './middleware/requireAuth.js';
import { requireRole } from './middleware/requireRole.js';

/** @param {ReturnType<import('./playersController.js').createPlayersController>} controller */
export function createPlayersRoutes(controller) {
  const router = Router();

  router.get('/search', requireAuth, controller.searchPlayers);
  // Play style on the coaches' player card: coaches and administration only.
  router.get(
    '/:id/play-style',
    requireAuth,
    requireRole([ROLE_CODES.ENTRENADOR, ROLE_CODES.ADMINISTRADOR]),
    controller.getPlayStyle,
  );

  return router;
}
