import { Router } from 'express';
import { ROLE_CODES, directoryQuerySchema } from '@ctcj/shared';

import { requireAuth } from './middleware/requireAuth.js';
import { requireRole } from './middleware/requireRole.js';
import { validateQuery } from './validators/authValidators.js';

const { ADMINISTRADOR, RECEPCION, ENTRENADOR } = ROLE_CODES;

/**
 * Staff directory: /api/admin/directory. The routes decide WHO may call
 * each endpoint; the use cases decide WHAT each role sees (coaches don't
 * get money matters or consents).
 * @param {ReturnType<import('./staffDirectoryController.js').createStaffDirectoryController>} controller
 */
export function createStaffDirectoryRoutes(controller) {
  const router = Router();
  const staff = [requireAuth, requireRole([ADMINISTRADOR, RECEPCION, ENTRENADOR])];
  const admin = [requireAuth, requireRole(ADMINISTRADOR)];

  router.get('/', ...staff, validateQuery(directoryQuerySchema), controller.list);
  // CSV: Administración only; no health data and no identity document.
  router.get('/export.csv', ...admin, validateQuery(directoryQuerySchema), controller.exportCsv);
  router.get('/:id', ...staff, controller.getFile);
  router.post('/:id/player-role', ...admin, controller.grantPlayer);
  router.delete('/:id/player-role', ...admin, controller.revokePlayer);
  router.post('/:id/deactivate', ...admin, controller.deactivate);
  router.post('/:id/reactivate', ...admin, controller.reactivate);
  router.post(
    '/:id/resend-verification',
    requireAuth,
    requireRole([ADMINISTRADOR, RECEPCION]),
    controller.resendVerification,
  );
  return router;
}
