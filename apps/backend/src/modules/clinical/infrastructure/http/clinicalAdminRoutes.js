import { Router } from 'express';
import {
  scheduleAppointmentSchema,
  cancelAppointmentSchema,
  createClinicalNoteSchema,
  createRecoveryPlanSchema,
  discontinueRecoveryPlanSchema,
  createMedicalHistoryEntrySchema,
  ROLE_CODES,
} from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { requireRole } from '../../../identity/infrastructure/http/middleware/requireRole.js';

import { validateBody } from './validators/clinicalValidators.js';

// Scheduling logistics only, no note content -- reachable by whoever
// coordinates appointments, across both disciplines.
const SCHEDULING_ROLES = [
  ROLE_CODES.ADMINISTRADOR,
  ROLE_CODES.RECEPCION,
  ROLE_CODES.PSICOLOGO,
  ROLE_CODES.NEUROPSICOLOGO,
  ROLE_CODES.FISIOTERAPEUTA,
];
// Marking a session's real-world outcome requires clinical judgment/
// presence -- RECEPCION coordinates logistics but has no way to know
// whether a session actually happened.
const OUTCOME_ROLES = [
  ROLE_CODES.ADMINISTRADOR,
  ROLE_CODES.PSICOLOGO,
  ROLE_CODES.NEUROPSICOLOGO,
  ROLE_CODES.FISIOTERAPEUTA,
];
// Note content: practitioners only, both disciplines. ADMINISTRADOR is
// deliberately excluded -- see Phase 14's "admin-exclusion access policy".
// Discipline siloing itself (a Psicologo never sees Physiotherapy notes and
// vice versa) is enforced in the application layer, not here -- this gate
// only decides who may reach the route at all.
const NOTE_ROLES = [ROLE_CODES.PSICOLOGO, ROLE_CODES.NEUROPSICOLOGO, ROLE_CODES.FISIOTERAPEUTA];
// Recovery plans and medical history are Physiotherapy-only concepts (no
// Psychology equivalent) -- Fisioterapeuta only, ADMINISTRADOR excluded for
// the same reason it's excluded from notes.
const PHYSIO_ROLES = [ROLE_CODES.FISIOTERAPEUTA];

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

  router.post(
    '/players/:id/recovery-plans',
    requireAuth,
    requireRole(PHYSIO_ROLES),
    validateBody(createRecoveryPlanSchema),
    controller.createRecoveryPlan,
  );
  router.get(
    '/players/:id/recovery-plans',
    requireAuth,
    requireRole(PHYSIO_ROLES),
    controller.listRecoveryPlans,
  );
  router.post(
    '/recovery-plans/:id/complete',
    requireAuth,
    requireRole(PHYSIO_ROLES),
    controller.completeRecoveryPlan,
  );
  router.post(
    '/recovery-plans/:id/discontinue',
    requireAuth,
    requireRole(PHYSIO_ROLES),
    validateBody(discontinueRecoveryPlanSchema),
    controller.discontinueRecoveryPlan,
  );

  router.post(
    '/players/:id/medical-history',
    requireAuth,
    requireRole(PHYSIO_ROLES),
    validateBody(createMedicalHistoryEntrySchema),
    controller.createMedicalHistoryEntry,
  );
  router.get(
    '/players/:id/medical-history',
    requireAuth,
    requireRole(PHYSIO_ROLES),
    controller.listMedicalHistory,
  );
  router.post(
    '/medical-history/:id/resolve',
    requireAuth,
    requireRole(PHYSIO_ROLES),
    controller.resolveMedicalHistoryEntry,
  );

  return router;
}
