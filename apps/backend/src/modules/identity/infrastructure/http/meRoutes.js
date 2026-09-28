import { Router } from 'express';
import {
  requestAffiliationSchema,
  requestGuardianshipSchema,
  updateMyProfileSchema,
  recordCookieConsentSchema,
} from '@ctcj/shared';

import { HttpError } from '../../../../shared/errors/httpError.js';

import { requireAuth } from './middleware/requireAuth.js';
import { validateBody } from './validators/authValidators.js';
import { avatarUpload } from './uploadMiddleware.js';

// Multer's own errors (e.g. LIMIT_FILE_SIZE) bypass mapIdentityError entirely
// -- this middleware runs before the controller/asyncHandler even executes,
// so they're translated to a clean HttpError here instead of falling through
// to the global handler's generic 500. A fileFilter rejection (wrong
// mimetype) doesn't set `err` at all -- multer just omits req.file -- so
// that case is caught downstream by uploadMyAvatar's own mimetype check.
function handleAvatarUpload(req, res, next) {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      return next(new HttpError(400, 'invalid_avatar_file', 'El archivo debe pesar máximo 2MB.'));
    }
    return next();
  });
}

/** @param {ReturnType<import('./meController.js').createMeController>} controller */
export function createMeRoutes(controller) {
  const router = Router();

  router.get('/', requireAuth, controller.getMyProfile);
  router.patch('/', requireAuth, validateBody(updateMyProfileSchema), controller.updateMyProfile);
  router.post('/avatar', requireAuth, handleAvatarUpload, controller.uploadMyAvatar);
  router.get('/achievements', requireAuth, controller.getMyAchievements);
  router.get('/membership-status', requireAuth, controller.getMembershipStatus);

  router.post(
    '/affiliation-requests',
    requireAuth,
    validateBody(requestAffiliationSchema),
    controller.requestAffiliation,
  );
  router.get('/affiliation-requests', requireAuth, controller.getMyAffiliationRequests);

  router.post(
    '/guardianships',
    requireAuth,
    validateBody(requestGuardianshipSchema),
    controller.requestGuardianship,
  );
  router.get('/guardianships', requireAuth, controller.listMyGuardianships);
  // The guardian's authorization for the linked minor's data and image.
  router.post('/guardianships/:id/minor-authorization', requireAuth, controller.authorizeMinor);
  router.delete(
    '/guardianships/:id/minor-authorization',
    requireAuth,
    controller.withdrawMinorAuthorization,
  );
  // What the signed-in person can't do yet (a minor pending authorization).
  router.get('/account-restrictions', requireAuth, controller.getAccountRestrictions);
  // Proof of the cookie decision of a signed-in person.
  router.post(
    '/consents/cookies',
    requireAuth,
    validateBody(recordCookieConsentSchema),
    controller.recordCookieConsent,
  );

  return router;
}
