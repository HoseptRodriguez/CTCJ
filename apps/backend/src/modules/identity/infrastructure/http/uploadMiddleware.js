import multer from 'multer';

import { ALLOWED_AVATAR_MIME_TYPES, MAX_AVATAR_BYTES } from '../../domain/policies/avatarPolicy.js';

/**
 * Multer stays entirely at this HTTP boundary -- application/domain never
 * import it (dependency-cruiser's application-no-infra rule already forbids
 * it generically). Memory storage, not disk: the buffer is handed to
 * uploadMyAvatar's AvatarStorage port, which owns where/how it's persisted.
 */
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES },
  fileFilter(req, file, cb) {
    cb(null, ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype));
  },
});
