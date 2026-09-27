import multer from 'multer';
import { COMMUNITY_MEDIA_LIMITS } from '@ctcj/shared';

import { HttpError } from '../../../../shared/errors/httpError.js';

const { MAX_POST_IMAGES, MAX_VIDEO_BYTES } = COMMUNITY_MEDIA_LIMITS;

/**
 * multipart/form-data for posts with media: `images` (up to 4), or `video`
 * (+ optional `poster`) when videos go through the server (local storage).
 * Memory storage; the per-file cap is the video's 50 MB -- the 10 MB photo
 * cap and the real-type checks are the use case's job. No fileFilter on
 * the declared type: the real type is read from the bytes later.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES, files: MAX_POST_IMAGES + 2, fields: 10 },
}).fields([
  { name: 'images', maxCount: MAX_POST_IMAGES },
  { name: 'video', maxCount: 1 },
  { name: 'poster', maxCount: 1 },
]);

export function parseMediaUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new HttpError(400, 'media_video_too_large', 'El archivo pesa demasiado.'));
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new HttpError(400, 'media_too_many_images', 'Demasiados archivos.'));
    }
    return next(err);
  });
}

/** Multipart request? (the JSON text-only path stays as before) */
export function isMultipart(req) {
  return (req.headers['content-type'] ?? '').startsWith('multipart/form-data');
}
