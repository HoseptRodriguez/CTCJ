import { Router } from 'express';
import {
  createPostSchema,
  createCommentSchema,
  reportContentSchema,
  ROLE_CODES,
} from '@ctcj/shared';

import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { requireRole } from '../../../identity/infrastructure/http/middleware/requireRole.js';

import { validateBody } from './validators/communityValidators.js';

/**
 * Every route here is JUGADOR-gated, both reads and writes -- a materially
 * tighter gate than e.g. competition's club activity feed (any
 * authenticated user). Deliberate: match results are objective club info,
 * posts are members' own words -- see the Phase 3c plan's own reasoning.
 *
 * @param {ReturnType<import('./communityController.js').createCommunityController>} controller
 */
export function createCommunityRoutes(controller) {
  const router = Router();
  const jugadorOnly = [requireAuth, requireRole(ROLE_CODES.JUGADOR)];

  router.post('/posts', ...jugadorOnly, validateBody(createPostSchema), controller.createPost);
  router.get('/posts', ...jugadorOnly, controller.listPosts);
  router.delete('/posts/:id', ...jugadorOnly, controller.deleteMyPost);

  router.get('/posts/:id/comments', ...jugadorOnly, controller.listComments);
  router.post(
    '/posts/:id/comments',
    ...jugadorOnly,
    validateBody(createCommentSchema),
    controller.createComment,
  );
  router.delete('/comments/:id', ...jugadorOnly, controller.deleteMyComment);

  router.post('/posts/:id/like', ...jugadorOnly, controller.likePost);
  router.delete('/posts/:id/like', ...jugadorOnly, controller.unlikePost);

  router.post(
    '/posts/:id/report',
    ...jugadorOnly,
    validateBody(reportContentSchema),
    controller.reportPost,
  );
  router.post(
    '/comments/:id/report',
    ...jugadorOnly,
    validateBody(reportContentSchema),
    controller.reportComment,
  );

  return router;
}
