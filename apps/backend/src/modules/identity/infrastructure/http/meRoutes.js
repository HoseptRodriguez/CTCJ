import { Router } from 'express';
import {
  requestAffiliationSchema,
  requestGuardianshipSchema,
  updateMyProfileSchema,
  recordCookieConsentSchema,
  setAuthorizationSchema,
  setGuardianAuthorizationSchema,
  completeAccountSchema,
  mfaCodeSchema,
} from '@ctcj/shared';

import { HttpError } from '../../../../shared/errors/httpError.js';
import { loginRateLimiter } from '../../../../shared/rateLimiters.js';

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
  // The guardian's optional health-data authorization for the linked minor.
  router.put(
    '/guardianships/:id/health-authorization',
    requireAuth,
    validateBody(setGuardianAuthorizationSchema),
    controller.setMinorHealthAuthorization,
  );
  // The guardian lets /torneos show the minor's full name (otherwise "Lucía R.").
  router.put(
    '/guardianships/:id/public-name-authorization',
    requireAuth,
    validateBody(setGuardianAuthorizationSchema),
    controller.setMinorPublicName,
  );
  // Optional authorizations ("Mis datos y privacidad"): see, accept, withdraw.
  router.get('/authorizations', requireAuth, controller.getMyAuthorizations);
  router.put(
    '/authorizations/:type',
    requireAuth,
    validateBody(setAuthorizationSchema),
    controller.setMyAuthorization,
  );
  // Two-step verification from the profile (optional roles; required ones turn it on at sign-in).
  router.get('/mfa', requireAuth, controller.getMfaStatus);
  router.post('/mfa/setup/start', requireAuth, loginRateLimiter, controller.startMfaSetup);
  router.post(
    '/mfa/setup/confirm',
    requireAuth,
    loginRateLimiter,
    validateBody(mfaCodeSchema),
    controller.confirmMfaSetup,
  );
  router.post(
    '/mfa/disable',
    requireAuth,
    loginRateLimiter,
    validateBody(mfaCodeSchema),
    controller.disableMfa,
  );
  router.post(
    '/mfa/recovery-codes',
    requireAuth,
    loginRateLimiter,
    validateBody(mfaCodeSchema),
    controller.regenerateRecoveryCodes,
  );
  // What the signed-in person can't do yet (a minor pending authorization).
  router.get('/account-restrictions', requireAuth, controller.getAccountRestrictions);
  // What an existing account must complete before continuing (birth date,
  // acceptance of the privacy policy and terms in force).
  router.get('/account-requirements', requireAuth, controller.getAccountRequirements);
  router.post(
    '/complete-account',
    requireAuth,
    validateBody(completeAccountSchema),
    controller.completeAccount,
  );
  // Proof of the cookie decision of a signed-in person.
  router.post(
    '/consents/cookies',
    requireAuth,
    validateBody(recordCookieConsentSchema),
    controller.recordCookieConsent,
  );

  return router;
}
