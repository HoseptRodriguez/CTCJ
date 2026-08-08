import { Router } from 'express';
import { createNoteSchema, recordPerformanceSnapshotSchema, ROLE_CODES } from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { requireRole } from '../../../identity/infrastructure/http/middleware/requireRole.js';

import { validateBody } from './validators/coachingValidators.js';

const COACH_STAFF_ROLES = [ROLE_CODES.ADMINISTRADOR, ROLE_CODES.ENTRENADOR];

/** @param {ReturnType<import('./coachingAdminController.js').createCoachingAdminController>} controller */
export function createCoachingAdminRoutes(controller) {
  const router = Router();

  router.post(
    '/players/:id/notes',
    requireAuth,
    requireRole(COACH_STAFF_ROLES),
    validateBody(createNoteSchema),
    controller.createNote,
  );
  router.get(
    '/players/:id/notes',
    requireAuth,
    requireRole(COACH_STAFF_ROLES),
    controller.listPlayerNotes,
  );

  router.post(
    '/players/:id/performance',
    requireAuth,
    requireRole(COACH_STAFF_ROLES),
    validateBody(recordPerformanceSnapshotSchema),
    controller.recordPerformanceSnapshot,
  );
  router.get(
    '/players/:id/performance',
    requireAuth,
    requireRole(COACH_STAFF_ROLES),
    controller.listPlayerPerformance,
  );

  router.get(
    '/recent-activity',
    requireAuth,
    requireRole(COACH_STAFF_ROLES),
    controller.getRecentActivity,
  );

  return router;
}
