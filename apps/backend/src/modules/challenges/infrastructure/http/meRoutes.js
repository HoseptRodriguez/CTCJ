import { Router } from 'express';
import { createChallengeSchema } from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';

import { validateBody } from './validators/challengesValidators.js';

/** @param {ReturnType<import('./meController.js').createMeController>} controller */
export function createMeRoutes(controller) {
  const router = Router();

  router.post('/', requireAuth, validateBody(createChallengeSchema), controller.createChallenge);
  router.get('/', requireAuth, controller.getMyChallenges);
  router.post('/:id/accept', requireAuth, controller.acceptChallenge);
  router.post('/:id/reject', requireAuth, controller.rejectChallenge);
  router.post('/:id/cancel', requireAuth, controller.cancelChallenge);

  return router;
}
