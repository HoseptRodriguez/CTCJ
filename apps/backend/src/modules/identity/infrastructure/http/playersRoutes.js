import { Router } from 'express';

import { requireAuth } from './middleware/requireAuth.js';

/** @param {ReturnType<import('./playersController.js').createPlayersController>} controller */
export function createPlayersRoutes(controller) {
  const router = Router();

  router.get('/search', requireAuth, controller.searchPlayers);

  return router;
}
