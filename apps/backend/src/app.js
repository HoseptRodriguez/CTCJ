import './shared/bigintJson.js';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { config } from './config/env.js';
import { logger } from './shared/logger.js';
import { toProblemDetail } from './shared/errors/httpError.js';
import { buildIdentityContainer } from './modules/identity/infrastructure/compositionRoot.js';
import { createGetMyAchievements } from './modules/identity/application/useCases/getMyAchievements.js';
import { createCompetitionProgressProviderAdapter } from './modules/identity/infrastructure/adapters/competitionProgressProviderAdapter.js';
import { createPerformanceProgressProviderAdapter } from './modules/identity/infrastructure/adapters/performanceProgressProviderAdapter.js';
import { createTrainingFrequencyProviderAdapter } from './modules/identity/infrastructure/adapters/trainingFrequencyProviderAdapter.js';
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
import { createPlayersController } from './modules/identity/infrastructure/http/playersController.js';
import { createPlayersRoutes } from './modules/identity/infrastructure/http/playersRoutes.js';
import { buildNotificationsContainer } from './modules/notifications/infrastructure/compositionRoot.js';
import { createMeController as createNotificationsMeController } from './modules/notifications/infrastructure/http/meController.js';
import { createMeRoutes as createNotificationsMeRoutes } from './modules/notifications/infrastructure/http/meRoutes.js';
import { buildChallengesContainer } from './modules/challenges/infrastructure/compositionRoot.js';
import { createMeController as createChallengesMeController } from './modules/challenges/infrastructure/http/meController.js';
import { createMeRoutes as createChallengesMeRoutes } from './modules/challenges/infrastructure/http/meRoutes.js';
import { createIdentityPlayerEligibilityProvider as createChallengesPlayerEligibilityProvider } from './modules/challenges/infrastructure/adapters/playerEligibilityProviderAdapter.js';
import { createIdentityPlayerDirectoryProvider as createChallengesPlayerDirectoryProvider } from './modules/challenges/infrastructure/adapters/playerDirectoryProviderAdapter.js';
import { createNotificationsSenderAdapter as createChallengesNotificationSender } from './modules/challenges/infrastructure/adapters/notificationSenderAdapter.js';
import { createMatchRecorderAdapter as createChallengesMatchRecorder } from './modules/challenges/infrastructure/adapters/matchRecorderAdapter.js';
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
import { createIdentityPlayerDirectoryProvider as createCoachingPlayerDirectoryProvider } from './modules/coaching/infrastructure/adapters/playerDirectoryProviderAdapter.js';
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
import { buildClinicalContainer } from './modules/clinical/infrastructure/compositionRoot.js';
import { createClinicalAdminController } from './modules/clinical/infrastructure/http/clinicalAdminController.js';
import { createClinicalAdminRoutes } from './modules/clinical/infrastructure/http/clinicalAdminRoutes.js';
import { createMeController as createClinicalMeController } from './modules/clinical/infrastructure/http/meController.js';
import { createMeRoutes as createClinicalMeRoutes } from './modules/clinical/infrastructure/http/meRoutes.js';
import { createIdentityPlayerEligibilityProvider as createClinicalPlayerEligibilityProvider } from './modules/clinical/infrastructure/adapters/playerEligibilityProviderAdapter.js';
import { createIdentityPractitionerEligibilityProvider } from './modules/clinical/infrastructure/adapters/practitionerEligibilityProviderAdapter.js';
import { createIdentityPlayerDirectoryProvider as createClinicalPlayerDirectoryProvider } from './modules/clinical/infrastructure/adapters/playerDirectoryProviderAdapter.js';
import { buildGoalsContainer } from './modules/goals/infrastructure/compositionRoot.js';
import { createMeController as createGoalsMeController } from './modules/goals/infrastructure/http/meController.js';
import { createMeRoutes as createGoalsMeRoutes } from './modules/goals/infrastructure/http/meRoutes.js';
import { createCompetitionProgressProviderAdapter as createGoalsCompetitionProgressProviderAdapter } from './modules/goals/infrastructure/adapters/competitionProgressProviderAdapter.js';
import { createPerformanceProgressProviderAdapter as createGoalsPerformanceProgressProviderAdapter } from './modules/goals/infrastructure/adapters/performanceProgressProviderAdapter.js';
import { createTrainingFrequencyProviderAdapter as createGoalsTrainingFrequencyProviderAdapter } from './modules/goals/infrastructure/adapters/trainingFrequencyProviderAdapter.js';

// apps/backend/src -> apps/backend/uploads (matches identity's
// compositionRoot.js AVATAR_UPLOADS_DIR resolution)
const UPLOADS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');

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

  // Player Profile (Phase 2) -- serves avatar images written by
  // localDiskAvatarStorage.js. Only uploads/avatars/* is ever written to,
  // but serving the whole uploads tree keeps this simple.
  app.use('/uploads', express.static(UPLOADS_DIR));

  const identityContainer = buildIdentityContainer();
  const authController = createAuthController(identityContainer);
  const roleAdminController = createRoleAdminController(identityContainer);
  const userAdminController = createUserAdminController(identityContainer);
  const meController = createMeController(identityContainer);
  const affiliationAdminController = createAffiliationAdminController(identityContainer);
  const guardianshipAdminController = createGuardianshipAdminController(identityContainer);
  const playersController = createPlayersController(identityContainer);

  app.use('/api/auth', createAuthRoutes(authController));
  app.use('/api/admin/roles', createRoleAdminRoutes(roleAdminController));
  app.use('/api/admin/users', createUserAdminRoutes(userAdminController));
  app.use('/api/identity/me', createMeRoutes(meController));
  app.use('/api/players', createPlayersRoutes(playersController));
  app.use(
    '/api/admin/affiliation-requests',
    createAffiliationAdminRoutes(affiliationAdminController),
  );
  app.use('/api/admin/guardianships', createGuardianshipAdminRoutes(guardianshipAdminController));

  // Notifications (Phase 3a) -- no cross-module deps of its own; built
  // right after identity since challenges (built next) needs its
  // createNotification function.
  const notificationsContainer = buildNotificationsContainer();
  const notificationsMeController = createNotificationsMeController(notificationsContainer);
  app.use('/api/notifications/me', createNotificationsMeRoutes(notificationsMeController));

  // Challenges (Phase 3a) -- needs both identity (eligibility/directory)
  // and notifications (createNotification), both already built above.
  // submitMatchScore also needs competition (to record a confirmed
  // friendly-match result), but competition isn't built yet at this point
  // -- built with the null MatchRecorder default here, patched with the
  // real one once competitionContainer exists below (see
  // _rebuildSubmitMatchScoreWithMatchRecorder's own docstring).
  const challengesPlayerEligibilityProvider = createChallengesPlayerEligibilityProvider({
    checkIsJugador: identityContainer.checkIsJugador,
  });
  const challengesPlayerDirectoryProvider = createChallengesPlayerDirectoryProvider({
    getUserSummaries: identityContainer.getUserSummaries,
  });
  const challengesNotificationSender = createChallengesNotificationSender({
    createNotification: notificationsContainer.createNotification,
  });
  const challengesContainer = buildChallengesContainer({
    playerEligibilityProvider: challengesPlayerEligibilityProvider,
    playerDirectoryProvider: challengesPlayerDirectoryProvider,
    notificationSender: challengesNotificationSender,
  });
  const challengesMeController = createChallengesMeController(challengesContainer);
  app.use('/api/challenges/me', createChallengesMeRoutes(challengesMeController));

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
  const coachingPlayerDirectoryProvider = createCoachingPlayerDirectoryProvider({
    getUserSummaries: identityContainer.getUserSummaries,
  });
  const coachingContainer = buildCoachingContainer({
    playerEligibilityProvider: coachingPlayerEligibilityProvider,
    playerDirectoryProvider: coachingPlayerDirectoryProvider,
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

  // Challenge match score confirmation -- same reverse-direction shape as
  // achievements below (challenges, the consumer, was necessarily built
  // before competition, the producer), but only submitMatchScore itself
  // needs rebuilding, not challengesContainer as a whole -- see
  // _rebuildSubmitMatchScoreWithMatchRecorder's own docstring. meController
  // reads container.submitMatchScore dynamically per-request, so patching
  // it now is safe.
  challengesContainer.submitMatchScore =
    challengesContainer._rebuildSubmitMatchScoreWithMatchRecorder(
      createChallengesMatchRecorder({
        recordMatchForOpenSeason: competitionContainer.recordMatchForOpenSeason,
      }),
    );

  // Achievements (Phase 2) -- the reverse direction of every other
  // cross-module wire-up in this file: identity is the *consumer* here, not
  // the producer, but its container was necessarily built before
  // booking/coaching/competition existed (they depend on identity's own
  // checkIsJugador/getUserSummaries). meController reads
  // identityContainer.getMyAchievements dynamically per-request (not a
  // closure captured at construction time), so patching it in now, after
  // all three producers exist, is safe -- mirrors tournament's identical
  // "consume a sibling module's already-built container" pattern above,
  // just wired after the fact instead of before.
  identityContainer.getMyAchievements = createGetMyAchievements({
    competitionProgressProvider: createCompetitionProgressProviderAdapter({
      getMyCompetitionSummary: competitionContainer.getMyCompetitionSummary,
    }),
    performanceProgressProvider: createPerformanceProgressProviderAdapter({
      getMyPerformance: coachingContainer.getMyPerformance,
    }),
    trainingFrequencyProvider: createTrainingFrequencyProviderAdapter({
      getMyTrainingFrequency: bookingContainer.getMyTrainingFrequency,
    }),
  });

  // Goals (Phase 2) -- same "consume booking/coaching/competition's
  // already-built containers" shape as achievements above, but goals has
  // its own module/container (a real player-owned resource with a
  // lifecycle), not a single patched-in use case on an existing container.
  const goalsContainer = buildGoalsContainer({
    competitionProgressProvider: createGoalsCompetitionProgressProviderAdapter({
      getMyCompetitionSummary: competitionContainer.getMyCompetitionSummary,
    }),
    performanceProgressProvider: createGoalsPerformanceProgressProviderAdapter({
      getMyPerformance: coachingContainer.getMyPerformance,
    }),
    trainingFrequencyProvider: createGoalsTrainingFrequencyProviderAdapter({
      getMyTrainingFrequency: bookingContainer.getMyTrainingFrequency,
    }),
  });
  const goalsMeController = createGoalsMeController(goalsContainer);
  app.use('/api/goals/me', createGoalsMeRoutes(goalsMeController));

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

  const clinicalPlayerEligibilityProvider = createClinicalPlayerEligibilityProvider({
    checkIsJugador: identityContainer.checkIsJugador,
  });
  // First consumer of identity's checkHasAnyRole primitive (added in this
  // phase alongside checkIsJugador, not replacing it) -- checks PSICOLOGO
  // or NEUROPSICOLOGO rather than a single fixed role.
  const clinicalPractitionerEligibilityProvider = createIdentityPractitionerEligibilityProvider({
    checkHasAnyRole: identityContainer.checkHasAnyRole,
  });
  const clinicalPlayerDirectoryProvider = createClinicalPlayerDirectoryProvider({
    getUserSummaries: identityContainer.getUserSummaries,
  });
  const clinicalContainer = buildClinicalContainer({
    playerEligibilityProvider: clinicalPlayerEligibilityProvider,
    practitionerEligibilityProvider: clinicalPractitionerEligibilityProvider,
    playerDirectoryProvider: clinicalPlayerDirectoryProvider,
  });
  const clinicalAdminController = createClinicalAdminController(clinicalContainer);
  const clinicalMeController = createClinicalMeController(clinicalContainer);
  app.use('/api/admin/clinical', createClinicalAdminRoutes(clinicalAdminController));
  app.use('/api/clinical/me', createClinicalMeRoutes(clinicalMeController));

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
