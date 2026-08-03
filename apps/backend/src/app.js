import './shared/bigintJson.js';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { config } from './config/env.js';
import { logger } from './shared/logger.js';
import { toProblemDetail } from './shared/errors/httpError.js';
import { buildIdentityContainer } from './modules/identity/infrastructure/compositionRoot.js';
import { createAuthController } from './modules/identity/infrastructure/http/authController.js';
import { createAuthRoutes } from './modules/identity/infrastructure/http/authRoutes.js';
import { createRoleAdminController } from './modules/identity/infrastructure/http/roleAdminController.js';
import { createRoleAdminRoutes } from './modules/identity/infrastructure/http/adminRoutes.js';
import { createUserAdminController } from './modules/identity/infrastructure/http/userAdminController.js';
import { createUserAdminRoutes } from './modules/identity/infrastructure/http/userAdminRoutes.js';
import { createMeController } from './modules/identity/infrastructure/http/meController.js';
import { createMeRoutes } from './modules/identity/infrastructure/http/meRoutes.js';
import { createAffiliationAdminController } from './modules/identity/infrastructure/http/affiliationAdminController.js';
import { createAffiliationAdminRoutes } from './modules/identity/infrastructure/http/affiliationAdminRoutes.js';
import { createGuardianshipAdminController } from './modules/identity/infrastructure/http/guardianshipAdminController.js';
import { createGuardianshipAdminRoutes } from './modules/identity/infrastructure/http/guardianshipAdminRoutes.js';
import { buildBookingContainer } from './modules/booking/infrastructure/compositionRoot.js';
import { createBookingController } from './modules/booking/infrastructure/http/bookingController.js';
import { createBookingRoutes } from './modules/booking/infrastructure/http/bookingRoutes.js';
import { createIdentityMembershipStatusProvider } from './modules/booking/infrastructure/adapters/membershipStatusProviderAdapter.js';
import { createIdentitySystemSettingBookingPolicy } from './modules/booking/infrastructure/adapters/bookingPolicySettingsAdapter.js';
import { createIdentityGuardianshipProvider } from './modules/booking/infrastructure/adapters/guardianshipProviderAdapter.js';
import { buildBillingContainer } from './modules/billing/infrastructure/compositionRoot.js';
import { createBillingAdminController } from './modules/billing/infrastructure/http/billingAdminController.js';
import { createBillingAdminRoutes } from './modules/billing/infrastructure/http/billingAdminRoutes.js';
import { createMeController as createBillingMeController } from './modules/billing/infrastructure/http/meController.js';
import { createMeRoutes as createBillingMeRoutes } from './modules/billing/infrastructure/http/meRoutes.js';
import { createIdentityPlayerEligibilityProvider } from './modules/billing/infrastructure/adapters/playerEligibilityProviderAdapter.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: !config.isTest }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', env: config.nodeEnv });
  });

  const identityContainer = buildIdentityContainer();
  const authController = createAuthController(identityContainer);
  const roleAdminController = createRoleAdminController(identityContainer);
  const userAdminController = createUserAdminController(identityContainer);
  const meController = createMeController(identityContainer);
  const affiliationAdminController = createAffiliationAdminController(identityContainer);
  const guardianshipAdminController = createGuardianshipAdminController(identityContainer);

  app.use('/api/auth', createAuthRoutes(authController));
  app.use('/api/admin/roles', createRoleAdminRoutes(roleAdminController));
  app.use('/api/admin/users', createUserAdminRoutes(userAdminController));
  app.use('/api/identity/me', createMeRoutes(meController));
  app.use(
    '/api/admin/affiliation-requests',
    createAffiliationAdminRoutes(affiliationAdminController),
  );
  app.use('/api/admin/guardianships', createGuardianshipAdminRoutes(guardianshipAdminController));

  // Cross-module wiring (Phase 5/6): booking owns narrow, single-purpose
  // ports; these adapters are the only bridge to identity, and app.js is the
  // only place allowed to connect them -- see .dependency-cruiser.js.
  const membershipStatusProvider = createIdentityMembershipStatusProvider({
    getMembershipStatus: identityContainer.getMembershipStatus,
  });
  const bookingPolicySettings = createIdentitySystemSettingBookingPolicy({
    getSystemSetting: identityContainer.getSystemSetting,
    setSystemSetting: identityContainer.setSystemSetting,
  });
  const guardianshipProvider = createIdentityGuardianshipProvider({
    canBookForMinor: identityContainer.canBookForMinor,
  });
  const bookingContainer = buildBookingContainer({
    membershipStatusProvider,
    bookingPolicySettings,
    guardianshipProvider,
  });
  const bookingController = createBookingController(bookingContainer);
  app.use('/api/booking', createBookingRoutes(bookingController));

  const playerEligibilityProvider = createIdentityPlayerEligibilityProvider({
    checkIsJugador: identityContainer.checkIsJugador,
  });
  const billingContainer = buildBillingContainer({ playerEligibilityProvider });
  const billingAdminController = createBillingAdminController(billingContainer);
  const billingMeController = createBillingMeController(billingContainer);
  app.use('/api/admin/billing', createBillingAdminRoutes(billingAdminController));
  app.use('/api/billing/me', createBillingMeRoutes(billingMeController));

  // Other module routers are mounted here as each module is implemented.

  app.use((req, res) => {
    res.status(404).json({
      type: 'https://ctcj.co/errors/not_found',
      title: 'Not found',
      status: 404,
      code: 'not_found',
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const { status, body } = toProblemDetail(err);
    if (status >= 500) {
      req.log?.error({ err }, 'Unhandled error');
    }
    res.status(status).json(body);
  });

  return app;
}
