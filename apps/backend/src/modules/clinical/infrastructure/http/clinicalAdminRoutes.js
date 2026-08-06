import { Router } from 'express';
import {
  scheduleAppointmentSchema,
  cancelAppointmentSchema,
  createClinicalNoteSchema,
  ROLE_CODES,
} from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { requireRole } from '../../../identity/infrastructure/http/middleware/requireRole.js';

import { validateBody } from './validators/clinicalValidators.js';

// Scheduling logistics only, no note content -- reachable by whoever
// coordinates appointments.
const SCHEDULING_ROLES = [
  ROLE_CODES.ADMINISTRADOR,
  ROLE_CODES.RECEPCION,
  ROLE_CODES.PSICOLOGO,
  ROLE_CODES.NEUROPSICOLOGO,
];
// Marking a session's real-world outcome requires clinical judgment/
// presence -- RECEPCION coordinates logistics but has no way to know
// whether a session actually happened.
const OUTCOME_ROLES = [ROLE_CODES.ADMINISTRADOR, ROLE_CODES.PSICOLOGO, ROLE_CODES.NEUROPSICOLOGO];
// Note content: practitioners only. ADMINISTRADOR is deliberately excluded
// -- see the Phase 14 plan's "admin-exclusion access policy" section.
const NOTE_ROLES = [ROLE_CODES.PSICOLOGO, ROLE_CODES.NEUROPSICOLOGO];

/** @param {ReturnType<import('./clinicalAdminController.js').createClinicalAdminController>} controller */
export function createClinicalAdminRoutes(controller) {
  const router = Router();

  router.post(
    '/appointments',
    requireAuth,
    requireRole(SCHEDULING_ROLES),
    validateBody(scheduleAppointmentSchema),
    controller.scheduleAppointment,
  );
  router.post(
    '/appointments/:id/cancel',
    requireAuth,
    requireRole(SCHEDULING_ROLES),
    validateBody(cancelAppointmentSchema),
    controller.cancelAppointment,
  );
  router.post(
    '/appointments/:id/complete',
    requireAuth,
    requireRole(OUTCOME_ROLES),
    controller.markCompleted,
  );
  router.post(
    '/appointments/:id/no-show',
    requireAuth,
    requireRole(OUTCOME_ROLES),
    controller.markNoShow,
  );
  router.get(
    '/appointments',
    requireAuth,
    requireRole(SCHEDULING_ROLES),
    controller.listAppointments,
  );

  router.post(
    '/players/:id/notes',
    requireAuth,
    requireRole(NOTE_ROLES),
    validateBody(createClinicalNoteSchema),
    controller.createNote,
  );
  router.get(
    '/players/:id/notes',
    requireAuth,
    requireRole(NOTE_ROLES),
    controller.listPlayerNotes,
  );

  return router;
}
