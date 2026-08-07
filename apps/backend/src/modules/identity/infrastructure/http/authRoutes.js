import { Router } from 'express';
import {
  registerSchema,
  loginSchema,
  verifyEmailQuerySchema,
  requestPasswordResetSchema,
  confirmPasswordResetSchema,
} from '@ctcj/shared';

import { validateBody, validateQuery } from './validators/authValidators.js';

/** @param {ReturnType<import('./authController.js').createAuthController>} controller */
export function createAuthRoutes(controller) {
  const router = Router();

  router.post('/register', validateBody(registerSchema), controller.register);
  router.post('/login', validateBody(loginSchema), controller.login);
  router.post('/refresh', controller.refresh);
  router.get('/verify', validateQuery(verifyEmailQuerySchema), controller.verify);
  router.post('/logout', controller.logout);
  router.post(
    '/password-reset/request',
    validateBody(requestPasswordResetSchema),
    controller.requestPasswordReset,
  );
  router.post(
    '/password-reset/confirm',
    validateBody(confirmPasswordResetSchema),
    controller.confirmPasswordReset,
  );

  return router;
}
