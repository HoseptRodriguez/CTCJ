import { Router } from 'express';
import {
  registerSchema,
  loginSchema,
  verifyEmailQuerySchema,
  requestPasswordResetSchema,
  confirmPasswordResetSchema,
} from '@ctcj/shared';

import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
} from '../../../../shared/rateLimiters.js';

import { validateBody, validateQuery } from './validators/authValidators.js';

/** @param {ReturnType<import('./authController.js').createAuthController>} controller */
export function createAuthRoutes(controller) {
  const router = Router();

  router.post('/register', registerRateLimiter, validateBody(registerSchema), controller.register);
  router.post('/login', loginRateLimiter, validateBody(loginSchema), controller.login);
  router.post('/refresh', controller.refresh);
  router.get('/verify', validateQuery(verifyEmailQuerySchema), controller.verify);
  router.post('/logout', controller.logout);
  router.post(
    '/password-reset/request',
    passwordResetRateLimiter,
    validateBody(requestPasswordResetSchema),
    controller.requestPasswordReset,
  );
  router.post(
    '/password-reset/confirm',
    passwordResetRateLimiter,
    validateBody(confirmPasswordResetSchema),
    controller.confirmPasswordReset,
  );

  return router;
}
