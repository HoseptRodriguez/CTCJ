import { Router } from 'express';
import {
  createTournamentSchema,
  addTournamentParticipantSchema,
  recordTournamentMatchResultSchema,
  ROLE_CODES,
} from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { requireRole } from '../../../identity/infrastructure/http/middleware/requireRole.js';

import { validateBody } from './validators/tournamentValidators.js';

const TOURNAMENT_STAFF_ROLES = [
  ROLE_CODES.ADMINISTRADOR,
  ROLE_CODES.RECEPCION,
  ROLE_CODES.ENTRENADOR,
];

/**
 * Single router, mixed gates -- mirrors competition's/booking's shape
 * (public read routes + staff-gated mutation routes in one router). No
 * "my own records" self-service concept here: registration is staff-only,
 * a bracket is club-wide reading, not owner-private data.
 *
 * @param {ReturnType<import('./tournamentController.js').createTournamentController>} controller
 */
export function createTournamentRoutes(controller) {
  const router = Router();

  router.get('/', controller.listTournaments); // public, bare list, no PII
  router.get('/:id', requireAuth, controller.getTournament); // any authenticated role, full bracket

  router.post(
    '/',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(createTournamentSchema),
    controller.createTournament,
  );
  router.post(
    '/:id/participants',
    requireAuth,
    requireRole(TOURNAMENT_STAFF_ROLES),
    validateBody(addTournamentParticipantSchema),
    controller.addParticipant,
  );
  router.delete(
    '/:id/participants/:participantId',
    requireAuth,
    requireRole(TOURNAMENT_STAFF_ROLES),
    controller.removeParticipant,
  );
  router.post(
    '/:id/generate-draw',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    controller.generateDraw,
  );
  router.post(
    '/:id/matches/:matchId/result',
    requireAuth,
    requireRole(TOURNAMENT_STAFF_ROLES),
    validateBody(recordTournamentMatchResultSchema),
    controller.recordMatchResult,
  );
  router.post(
    '/:id/cancel',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    controller.cancelTournament,
  );

  return router;
}
