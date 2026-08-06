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
import { createIdentityPlayerDirectoryProvider } from './modules/billing/infrastructure/adapters/playerDirectoryProviderAdapter.js';
import { buildCoachingContainer } from './modules/coaching/infrastructure/compositionRoot.js';
import { createCoachingAdminController } from './modules/coaching/infrastructure/http/coachingAdminController.js';
import { createCoachingAdminRoutes } from './modules/coaching/infrastructure/http/coachingAdminRoutes.js';
import { createMeController as createCoachingMeController } from './modules/coaching/infrastructure/http/meController.js';
import { createMeRoutes as createCoachingMeRoutes } from './modules/coaching/infrastructure/http/meRoutes.js';
import { createIdentityPlayerEligibilityProvider as createCoachingPlayerEligibilityProvider } from './modules/coaching/infrastructure/adapters/playerEligibilityProviderAdapter.js';
import { buildCompetitionContainer } from './modules/competition/infrastructure/compositionRoot.js';
import { createCompetitionController } from './modules/competition/infrastructure/http/competitionController.js';
import { createCompetitionRoutes } from './modules/competition/infrastructure/http/competitionRoutes.js';
import { createIdentityPlayerEligibilityProvider as createCompetitionPlayerEligibilityProvider } from './modules/competition/infrastructure/adapters/playerEligibilityProviderAdapter.js';
import { createIdentityPlayerDirectoryProvider as createCompetitionPlayerDirectoryProvider } from './modules/competition/infrastructure/adapters/playerDirectoryProviderAdapter.js';
import { buildTournamentContainer } from './modules/tournament/infrastructure/compositionRoot.js';
import { createTournamentController } from './modules/tournament/infrastructure/http/tournamentController.js';
import { createTournamentRoutes } from './modules/tournament/infrastructure/http/tournamentRoutes.js';
import { createIdentityPlayerEligibilityProvider as createTournamentPlayerEligibilityProvider } from './modules/tournament/infrastructure/adapters/playerEligibilityProviderAdapter.js';
import { createIdentityPlayerDirectoryProvider as createTournamentPlayerDirectoryProvider } from './modules/tournament/infrastructure/adapters/playerDirectoryProviderAdapter.js';
import { createCompetitionStandingsProvider } from './modules/tournament/infrastructure/adapters/standingsProviderAdapter.js';

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
  const playerDirectoryProvider = createIdentityPlayerDirectoryProvider({
    getUserSummaries: identityContainer.getUserSummaries,
  });
  const billingContainer = buildBillingContainer({
    playerEligibilityProvider,
    playerDirectoryProvider,
  });
  const billingAdminController = createBillingAdminController(billingContainer);
  const billingMeController = createBillingMeController(billingContainer);
  app.use('/api/admin/billing', createBillingAdminRoutes(billingAdminController));
  app.use('/api/billing/me', createBillingMeRoutes(billingMeController));

  const coachingPlayerEligibilityProvider = createCoachingPlayerEligibilityProvider({
    checkIsJugador: identityContainer.checkIsJugador,
  });
  const coachingContainer = buildCoachingContainer({
    playerEligibilityProvider: coachingPlayerEligibilityProvider,
  });
  const coachingAdminController = createCoachingAdminController(coachingContainer);
  const coachingMeController = createCoachingMeController(coachingContainer);
  app.use('/api/admin/coaching', createCoachingAdminRoutes(coachingAdminController));
  app.use('/api/coaching/me', createCoachingMeRoutes(coachingMeController));

  const competitionPlayerEligibilityProvider = createCompetitionPlayerEligibilityProvider({
    checkIsJugador: identityContainer.checkIsJugador,
  });
  const competitionPlayerDirectoryProvider = createCompetitionPlayerDirectoryProvider({
    getUserSummaries: identityContainer.getUserSummaries,
  });
  const competitionContainer = buildCompetitionContainer({
    playerEligibilityProvider: competitionPlayerEligibilityProvider,
    playerDirectoryProvider: competitionPlayerDirectoryProvider,
  });
  const competitionController = createCompetitionController(competitionContainer);
  app.use('/api/competition', createCompetitionRoutes(competitionController));

  const tournamentPlayerEligibilityProvider = createTournamentPlayerEligibilityProvider({
    checkIsJugador: identityContainer.checkIsJugador,
  });
  const tournamentPlayerDirectoryProvider = createTournamentPlayerDirectoryProvider({
    getUserSummaries: identityContainer.getUserSummaries,
  });
  // The first module-to-module cross-module dependency in this codebase
  // that isn't module-to-identity: tournament seeding reads competition's
  // live standings via its exported application-layer getStandings
  // function, never its persistence -- same adapter shape as every
  // identity dependency above, just pointed at a different module.
  const tournamentStandingsProvider = createCompetitionStandingsProvider({
    getStandings: competitionContainer.getStandings,
  });
  const tournamentContainer = buildTournamentContainer({
    playerEligibilityProvider: tournamentPlayerEligibilityProvider,
    playerDirectoryProvider: tournamentPlayerDirectoryProvider,
    standingsProvider: tournamentStandingsProvider,
  });
  const tournamentController = createTournamentController(tournamentContainer);
  app.use('/api/tournaments', createTournamentRoutes(tournamentController));

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
