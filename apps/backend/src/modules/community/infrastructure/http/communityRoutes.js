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
import { isMultipart, parseMediaUpload } from './mediaUpload.js';

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

  // Text only: JSON (as before). With photos/video: multipart/form-data.
  router.post('/posts', ...jugadorOnly, (req, res, next) =>
    isMultipart(req)
      ? parseMediaUpload(req, res, (err) =>
          err ? next(err) : controller.createMediaPost(req, res, next),
        )
      : validateBody(createPostSchema)(req, res, (err) =>
          err ? next(err) : controller.createPost(req, res, next),
        ),
  );
  // What the composer may offer (minors: text only) and how videos upload.
  router.get('/me/media-capabilities', ...jugadorOnly, controller.getMediaCapabilities);
  // Signs a direct browser -> Vercel Blob video upload (handleUpload).
  router.post('/media/video-upload', ...jugadorOnly, controller.videoUpload);
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
