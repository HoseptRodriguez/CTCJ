import { ROLE_CODES, announcementSchema } from '@ctcj/shared';
import { Router } from 'express';
import multer from 'multer';

import { HttpError } from '../../../../shared/errors/httpError.js';
import { requireAuth } from '../../../identity/infrastructure/http/middleware/requireAuth.js';
import { requireRole } from '../../../identity/infrastructure/http/middleware/requireRole.js';

import { mapNotificationsError } from './errorMapping.js';
import { validateBody } from './validators/notificationValidators.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter(req, file, cb) {
    cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapNotificationsError(err)));
  };
}

/**
 * /api/admin/announcements -- Comunicados, Administración only.
 * @param {ReturnType<import('../compositionRoot.js').buildNotificationsContainer>} container
 */
export function createAnnouncementRoutes(container) {
  const router = Router();
  const admin = [requireAuth, requireRole(ROLE_CODES.ADMINISTRADOR)];

  router.get(
    '/',
    ...admin,
    asyncHandler(async (req, res) => {
      res.status(200).json(await container.listAnnouncements());
    }),
  );

  router.post(
    '/preview',
    ...admin,
    validateBody(announcementSchema),
    asyncHandler(async (req, res) => {
      res.status(200).json(await container.previewAnnouncement(req.body));
    }),
  );

  router.post(
    '/',
    ...admin,
    validateBody(announcementSchema),
    asyncHandler(async (req, res) => {
      const created = await container.createAnnouncement({ ...req.body, createdBy: req.user.id });
      res.status(201).json(created);
    }),
  );

  router.post(
    '/:id/cancel',
    ...admin,
    asyncHandler(async (req, res) => {
      res.status(200).json(await container.cancelAnnouncement({ id: req.params.id }));
    }),
  );

  router.post(
    '/images',
    ...admin,
    (req, res, next) =>
      upload.single('image')(req, res, (err) =>
        err
          ? next(
              new HttpError(400, 'invalid_announcement_image', 'La imagen debe pesar máximo 5 MB.'),
            )
          : next(),
      ),
    asyncHandler(async (req, res) => {
      if (!req.file) {
        throw new HttpError(400, 'invalid_announcement_image', 'Sube una imagen JPG, PNG o WebP.');
      }
      res.status(201).json(await container.uploadAnnouncementImage({ buffer: req.file.buffer }));
    }),
  );

  return router;
}
