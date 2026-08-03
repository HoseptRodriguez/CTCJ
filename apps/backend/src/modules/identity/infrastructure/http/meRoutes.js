import { Router } from 'express';
import { requestAffiliationSchema, requestGuardianshipSchema } from '@ctcj/shared';

import { requireAuth } from './middleware/requireAuth.js';
import { validateBody } from './validators/authValidators.js';

/** @param {ReturnType<import('./meController.js').createMeController>} controller */
export function createMeRoutes(controller) {
  const router = Router();

  router.get('/membership-status', requireAuth, controller.getMembershipStatus);

  router.post(
    '/affiliation-requests',
    requireAuth,
    validateBody(requestAffiliationSchema),
    controller.requestAffiliation,
  );
  router.get('/affiliation-requests', requireAuth, controller.getMyAffiliationRequests);

  router.post(
    '/guardianships',
    requireAuth,
    validateBody(requestGuardianshipSchema),
    controller.requestGuardianship,
  );
  router.get('/guardianships', requireAuth, controller.listMyGuardianships);

  return router;
}
