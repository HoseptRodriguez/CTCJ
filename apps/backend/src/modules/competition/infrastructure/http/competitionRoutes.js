import { Router } from 'express';
import {
  createSeasonSchema,
  recordMatchSchema,
  voidMatchSchema,
  standingsQuerySchema,
  matchesQuerySchema,
  ROLE_CODES,
} from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { requireRole } from '../../../identity/infrastructure/http/middleware/requireRole.js';

import { validateBody, validateQuery } from './validators/competitionValidators.js';

const COMPETITION_STAFF_ROLES = [
  ROLE_CODES.ADMINISTRADOR,
  ROLE_CODES.RECEPCION,
  ROLE_CODES.ENTRENADOR,
];

/**
 * Single router, mixed gates -- mirrors booking's bookingRoutes.js shape
 * (public read routes + staff-gated mutation/config routes in one router)
 * rather than billing's/coaching's admin-vs-me split, since there's no "my
 * own records" self-service concept here: results are staff-recorded about
 * players, and standings are club-wide reading, not owner-private data.
 *
 * @param {ReturnType<import('../compositionRoot.js').buildCompetitionContainer>} controller
 */
export function createCompetitionRoutes(controller) {
  const router = Router();

  router.get('/seasons', controller.listSeasons);
  router.get(
    '/standings',
    requireAuth,
    validateQuery(standingsQuerySchema),
    controller.getStandings,
  );
  router.get('/matches', requireAuth, validateQuery(matchesQuerySchema), controller.listMatches);
  router.get('/matches/recent', requireAuth, controller.getRecentClubMatches);
  router.get('/me/summary', requireAuth, controller.getMyCompetitionSummary);

  router.post(
    '/seasons',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    validateBody(createSeasonSchema),
    controller.createSeason,
  );
  router.post(
    '/seasons/:id/close',
    requireAuth,
    requireRole(ROLE_CODES.ADMINISTRADOR),
    controller.closeSeason,
  );

  router.post(
    '/matches',
    requireAuth,
    requireRole(COMPETITION_STAFF_ROLES),
    validateBody(recordMatchSchema),
    controller.recordMatch,
  );
  router.post(
    '/matches/:id/void',
    requireAuth,
    requireRole(COMPETITION_STAFF_ROLES),
    validateBody(voidMatchSchema),
    controller.voidMatch,
  );

  return router;
}
