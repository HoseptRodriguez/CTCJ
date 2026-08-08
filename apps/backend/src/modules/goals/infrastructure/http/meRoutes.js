import { Router } from 'express';
import { createGoalSchema } from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';

import { validateBody } from './validators/goalsValidators.js';

/** @param {ReturnType<import('./meController.js').createMeController>} controller */
export function createMeRoutes(controller) {
  const router = Router();

  router.post('/', requireAuth, validateBody(createGoalSchema), controller.createGoal);
  router.get('/', requireAuth, controller.getMyGoals);
  router.post('/:id/abandon', requireAuth, controller.abandonGoal);

  return router;
}
