import './shared/bigintJson.js';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { config } from './config/env.js';
import { errorForLog, httpLogOptions, logger } from './shared/logger.js';
import { unsubscribeRateLimiter } from './shared/rateLimiters.js';
import { toProblemDetail } from './shared/errors/httpError.js';
import { assertUtf8Body, toBodyParserHttpError } from './shared/utf8Body.js';
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
import { createAnnouncementRoutes } from './modules/notifications/infrastructure/http/announcementRoutes.js';
import {
  createEmailEventsRoute,
  createUnsubscribeRoutes,
} from './modules/notifications/infrastructure/http/publicRoutes.js';
import { buildChallengesContainer } from './modules/challenges/infrastructure/compositionRoot.js';
import { createMeController as createChallengesMeController } from './modules/challenges/infrastructure/http/meController.js';
import { createMeRoutes as createChallengesMeRoutes } from './modules/challenges/infrastructure/http/meRoutes.js';
import { createIdentityPlayerEligibilityProvider as createChallengesPlayerEligibilityProvider } from './modules/challenges/infrastructure/adapters/playerEligibilityProviderAdapter.js';
import { createIdentityPlayerDirectoryProvider as createChallengesPlayerDirectoryProvider } from './modules/challenges/infrastructure/adapters/playerDirectoryProviderAdapter.js';
import { createNotificationsSenderAdapter as createChallengesNotificationSender } from './modules/challenges/infrastructure/adapters/notificationSenderAdapter.js';
import { createMatchRecorderAdapter as createChallengesMatchRecorder } from './modules/challenges/infrastructure/adapters/matchRecorderAdapter.js';
import { buildCommunityContainer } from './modules/community/infrastructure/compositionRoot.js';
import { createCommunityController } from './modules/community/infrastructure/http/communityController.js';
import { createCommunityRoutes } from './modules/community/infrastructure/http/communityRoutes.js';
import { createAdminController as createCommunityAdminController } from './modules/community/infrastructure/http/adminController.js';
import { createAdminRoutes as createCommunityAdminRoutes } from './modules/community/infrastructure/http/adminRoutes.js';
import { createIdentityPlayerEligibilityProvider as createCommunityPlayerEligibilityProvider } from './modules/community/infrastructure/adapters/playerEligibilityProviderAdapter.js';
import { createIdentityPlayerDirectoryProvider as createCommunityPlayerDirectoryProvider } from './modules/community/infrastructure/adapters/playerDirectoryProviderAdapter.js';
import { createNotificationsSenderAdapter as createCommunityNotificationSender } from './modules/community/infrastructure/adapters/notificationSenderAdapter.js';
import { createIdentityMinorStatusProvider as createCommunityMinorStatusProvider } from './modules/community/infrastructure/adapters/minorStatusProviderAdapter.js';
import { createIdentityCommunityRulesProvider } from './modules/community/infrastructure/adapters/communityRulesProviderAdapter.js';
import { createVercelBlobMediaStorage } from './modules/community/infrastructure/storage/vercelBlobMediaStorage.js';
import { createLocalDiskMediaStorage } from './modules/community/infrastructure/storage/localDiskMediaStorage.js';
import { buildBookingContainer } from './modules/booking/infrastructure/compositionRoot.js';
import { createBookingController } from './modules/booking/infrastructure/http/bookingController.js';
import { createBookingRoutes } from './modules/booking/infrastructure/http/bookingRoutes.js';
import { createIdentityMembershipStatusProvider } from './modules/booking/infrastructure/adapters/membershipStatusProviderAdapter.js';
import { createIdentitySystemSettingBookingPolicy } from './modules/booking/infrastructure/adapters/bookingPolicySettingsAdapter.js';
import { createIdentityGuardianshipProvider } from './modules/booking/infrastructure/adapters/guardianshipProviderAdapter.js';
import { createIdentityMinorAuthorizationProvider } from './modules/booking/infrastructure/adapters/minorAuthorizationProviderAdapter.js';
import { createIdentityPlayerDirectoryProvider as createBookingPlayerDirectoryProvider } from './modules/booking/infrastructure/adapters/playerDirectoryProviderAdapter.js';
import { buildBillingContainer } from './modules/billing/infrastructure/compositionRoot.js';
import { createBillingAdminController } from './modules/billing/infrastructure/http/billingAdminController.js';
import { createBillingAdminRoutes } from './modules/billing/infrastructure/http/billingAdminRoutes.js';
import { createMeController as createBillingMeController } from './modules/billing/infrastructure/http/meController.js';
import { createMeRoutes as createBillingMeRoutes } from './modules/billing/infrastructure/http/meRoutes.js';
import { createIdentityPlayerEligibilityProvider } from './modules/billing/infrastructure/adapters/playerEligibilityProviderAdapter.js';
import { createIdentityPlayerDirectoryProvider } from './modules/billing/infrastructure/adapters/playerDirectoryProviderAdapter.js';
import { createIdentitySystemSettingBillingSettings } from './modules/billing/infrastructure/adapters/billingSettingsAdapter.js';
import { createNotificationsSenderAdapter as createBillingNotificationSender } from './modules/billing/infrastructure/adapters/notificationSenderAdapter.js';
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
import { createIdentityPublicNameProvider } from './modules/tournament/infrastructure/adapters/publicNameProviderAdapter.js';
import { buildClinicalContainer } from './modules/clinical/infrastructure/compositionRoot.js';
import { createClinicalAdminController } from './modules/clinical/infrastructure/http/clinicalAdminController.js';
import { createClinicalAdminRoutes } from './modules/clinical/infrastructure/http/clinicalAdminRoutes.js';
import { createMeController as createClinicalMeController } from './modules/clinical/infrastructure/http/meController.js';
import { createMeRoutes as createClinicalMeRoutes } from './modules/clinical/infrastructure/http/meRoutes.js';
import { createIdentityPlayerEligibilityProvider as createClinicalPlayerEligibilityProvider } from './modules/clinical/infrastructure/adapters/playerEligibilityProviderAdapter.js';
import { createIdentityPractitionerEligibilityProvider } from './modules/clinical/infrastructure/adapters/practitionerEligibilityProviderAdapter.js';
import { createIdentityPlayerDirectoryProvider as createClinicalPlayerDirectoryProvider } from './modules/clinical/infrastructure/adapters/playerDirectoryProviderAdapter.js';
import { createIdentityHealthAuthorizationProvider } from './modules/clinical/infrastructure/adapters/healthAuthorizationProviderAdapter.js';
import { createStaffDirectoryController } from './modules/identity/infrastructure/http/staffDirectoryController.js';
import { createStaffDirectoryRoutes } from './modules/identity/infrastructure/http/staffDirectoryRoutes.js';
import { buildInquiriesContainer } from './modules/inquiries/infrastructure/compositionRoot.js';
import { createInquiriesController } from './modules/inquiries/infrastructure/http/inquiriesController.js';
import {
  createAdminInquiriesRoutes,
  createPublicInquiriesRoutes,
} from './modules/inquiries/infrastructure/http/inquiriesRoutes.js';
import { buildPrivacyContainer } from './modules/privacy/infrastructure/compositionRoot.js';
import { createPrivacyController } from './modules/privacy/infrastructure/http/privacyController.js';
import {
  createPrivacyAdminRoutes,
  createPrivacyMeRoutes,
} from './modules/privacy/infrastructure/http/privacyRoutes.js';
import { createIdentityPersonDirectory } from './modules/privacy/infrastructure/adapters/personDirectoryAdapter.js';
import { createAccountEraser } from './modules/privacy/infrastructure/adapters/accountEraserAdapter.js';
import { buildGoalsContainer } from './modules/goals/infrastructure/compositionRoot.js';
import { createMeController as createGoalsMeController } from './modules/goals/infrastructure/http/meController.js';
import { createMeRoutes as createGoalsMeRoutes } from './modules/goals/infrastructure/http/meRoutes.js';
import { createCompetitionProgressProviderAdapter as createGoalsCompetitionProgressProviderAdapter } from './modules/goals/infrastructure/adapters/competitionProgressProviderAdapter.js';
import { createPerformanceProgressProviderAdapter as createGoalsPerformanceProgressProviderAdapter } from './modules/goals/infrastructure/adapters/performanceProgressProviderAdapter.js';
import { createTrainingFrequencyProviderAdapter as createGoalsTrainingFrequencyProviderAdapter } from './modules/goals/infrastructure/adapters/trainingFrequencyProviderAdapter.js';

// apps/backend/src -> apps/backend/uploads (matches identity's
// compositionRoot.js AVATAR_UPLOADS_DIR resolution)
const UPLOADS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');

/**
 * @param {{ mfaEnforceStaff?: boolean }} [options] tests of the two-step
 *   verification turn it on even where .env.test doesn't.
 */
export function createApp({ mfaEnforceStaff } = {}) {
  const app = express();

  // Render sits behind one reverse-proxy hop; without this, req.ip (used
  // for both audit logging in authController and rate limiting below)
  // would resolve to the proxy's address for every request instead of the
  // real client.
  if (config.isProduction) {
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');
  app.use(
    helmet({
      // Content-Security-Policy: everything from this site (fonts are
      // self-hosted, no third-party scripts), plus Vercel Blob for photos,
      // videos and direct uploads. Nobody may frame the site (clickjacking).
      contentSecurityPolicy: {
        directives: {
          'font-src': ["'self'", 'data:'],
          // Inline style attributes come from the animation library.
          'style-src': ["'self'", "'unsafe-inline'"],
          'frame-ancestors': ["'none'"],
          // Avatars live in Vercel Blob (an absolute URL on its own CDN host)
          // whenever BLOB_READ_WRITE_TOKEN is set -- helmet's default img-src
          // ('self' data:) would block them on the production-served frontend.
          'img-src': ["'self'", 'data:', 'blob:', 'https://*.public.blob.vercel-storage.com'],
          // Community videos (Blob CDN) and local previews before upload.
          'media-src': ["'self'", 'blob:', 'https://*.public.blob.vercel-storage.com'],
          // Direct browser -> Vercel Blob video uploads.
          'connect-src': [
            "'self'",
            'https://blob.vercel-storage.com',
            'https://*.blob.vercel-storage.com',
          ],
        },
      },
      // One year; the browser only talks HTTPS to the site from then on.
      strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
      frameguard: { action: 'deny' },
      // No referrer to other sites (the URL can carry an id).
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  // Browser features the site never uses stay off (helmet doesn't set it).
  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    );
    next();
  });
  app.use(
    cors({
      // Comma-separated in .env so a LAN IP (e.g. for testing on a phone)
      // can be allowed alongside localhost without a schema change.
      origin: config.corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  // Resend webhook: needs the raw body for its signature, so it goes
  // before the JSON parser. The container is built below; the handler only
  // runs on requests.
  app.post(
    '/api/notifications/email-events',
    ...createEmailEventsRoute({
      container: {
        markEmailOpened: (input) => app.locals.notifications.markEmailOpened(input),
      },
      secret: config.resendWebhookSecret,
    }),
  );
  app.use(express.json({ verify: assertUtf8Body }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: !config.isTest, ...httpLogOptions }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', env: config.nodeEnv });
  });

  // Player Profile (Phase 2) -- serves avatar images written by
  // localDiskAvatarStorage.js. Only uploads/avatars/* is ever written to,
  // but serving the whole uploads tree keeps this simple.
  app.use('/uploads', express.static(UPLOADS_DIR));

  const identityContainer = buildIdentityContainer(
    mfaEnforceStaff === undefined ? {} : { mfaEnforceStaff },
  );
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
  // Staff directory of players and accounts (/staff/jugadores).
  app.use(
    '/api/admin/directory',
    createStaffDirectoryRoutes(createStaffDirectoryController(identityContainer)),
  );
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
  // Emails and announcements (Ley 2300): who to write to and their
  // promotional authorizations come from identity; categories and
  // tournament players from competition and tournament, built further
  // down (the closures only run on requests, after everything exists).
  const notificationsContainer = buildNotificationsContainer({
    logger,
    contactDirectory: {
      getNotificationContacts: identityContainer.getNotificationContacts,
      listNotifiableUserIds: identityContainer.listNotifiableUserIds,
    },
    marketingGateway: {
      getMarketingPreferences: identityContainer.getMarketingPreferences,
      setMarketingPreferences: identityContainer.setMarketingPreferences,
      stopMarketingEmails: identityContainer.stopMarketingEmails,
    },
    audienceDirectory: {
      async playerIdsInCategory({ category }) {
        const players = await identityContainer.listNotifiableUserIds({ scope: 'PLAYERS' });
        // eslint-disable-next-line no-use-before-define
        const categories = await competitionContainer.getPlayerCategories({ playerIds: players });
        return players.filter((id) => (categories.get(id) ?? []).includes(category));
      },
      async playerIdsInTournament({ tournamentId }) {
        // eslint-disable-next-line no-use-before-define
        return (await tournamentContainer.getTournamentAudience({ tournamentId }))?.playerIds ?? [];
      },
      async tournamentName({ tournamentId }) {
        // eslint-disable-next-line no-use-before-define
        return (await tournamentContainer.getTournamentAudience({ tournamentId }))?.name ?? null;
      },
    },
  });
  app.locals.notifications = notificationsContainer;
  const notificationsMeController = createNotificationsMeController(notificationsContainer);
  app.use('/api/notifications/me', createNotificationsMeRoutes(notificationsMeController));
  app.use(
    '/api/notifications/unsubscribe',
    createUnsubscribeRoutes({
      container: notificationsContainer,
      rateLimiter: unsubscribeRateLimiter,
    }),
  );
  app.use('/api/admin/announcements', createAnnouncementRoutes(notificationsContainer));

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

  // Community (Phase 3c) -- posts/comments/likes/reports. Needs identity
  // (eligibility/directory) and notifications (createNotification), both
  // already built above -- unlike challenges' MatchRecorder, nothing here
  // needs a build-then-patch step. Mounted at /api/community directly (no
  // /me suffix), matching competition's/booking's naming convention: this
  // router mixes club-wide feed reads with self-scoped writes under one
  // gate, not a "my own resources" me-controller like challenges/billing/goals.
  const communityPlayerEligibilityProvider = createCommunityPlayerEligibilityProvider({
    checkIsJugador: identityContainer.checkIsJugador,
  });
  const communityPlayerDirectoryProvider = createCommunityPlayerDirectoryProvider({
    getUserSummaries: identityContainer.getUserSummaries,
  });
  const communityNotificationSender = createCommunityNotificationSender({
    createNotification: notificationsContainer.createNotification,
  });
  // Post photos/videos: Vercel Blob whenever a token is configured (always
  // in production), local disk under uploads/community otherwise.
  const communityMediaStorage = config.blob.readWriteToken
    ? createVercelBlobMediaStorage({ token: config.blob.readWriteToken })
    : createLocalDiskMediaStorage({ uploadsDir: UPLOADS_DIR });
  const communityContainer = buildCommunityContainer({
    playerEligibilityProvider: communityPlayerEligibilityProvider,
    playerDirectoryProvider: communityPlayerDirectoryProvider,
    notificationSender: communityNotificationSender,
    minorStatusProvider: createCommunityMinorStatusProvider({
      checkIsMinor: identityContainer.checkIsMinor,
      isPendingGuardianAuthorization: identityContainer.isPendingGuardianAuthorization,
    }),
    // Posting, commenting and uploading need the Community rules accepted.
    communityRulesProvider: createIdentityCommunityRulesProvider({
      hasAuthorizationInForce: identityContainer.hasAuthorizationInForce,
    }),
    mediaStorage: communityMediaStorage,
  });
  const communityController = createCommunityController(communityContainer, {
    blobToken: config.blob.readWriteToken,
  });
  app.use('/api/community', createCommunityRoutes(communityController));
  const communityAdminController = createCommunityAdminController(communityContainer);
  app.use('/api/admin/community', createCommunityAdminRoutes(communityAdminController));

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
    minorAuthorizationProvider: createIdentityMinorAuthorizationProvider({
      isPendingGuardianAuthorization: identityContainer.isPendingGuardianAuthorization,
    }),
    // Staff-only names on the schedule (who to charge at the front desk).
    playerDirectoryProvider: createBookingPlayerDirectoryProvider({
      getUserSummaries: identityContainer.getUserSummaries,
    }),
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
    billingSettings: createIdentitySystemSettingBillingSettings({
      getSystemSetting: identityContainer.getSystemSetting,
      setSystemSetting: identityContainer.setSystemSetting,
    }),
    notificationSender: createBillingNotificationSender({
      createNotification: notificationsContainer.createNotification,
    }),
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
  // The directory shows each player's categories from the open season.
  identityContainer.usePlayerCategoryProvider({
    getCategories: (playerIds) => competitionContainer.getPlayerCategories({ playerIds }),
  });
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
    publicNameProvider: createIdentityPublicNameProvider({
      getUserSummaries: identityContainer.getUserSummaries,
      fullNameAllowedFor: identityContainer.fullNameAllowedFor,
    }),
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
    // Health data is only recorded with the explicit authorization in force.
    healthAuthorizationProvider: createIdentityHealthAuthorizationProvider({
      hasAuthorizationInForce: identityContainer.hasAuthorizationInForce,
    }),
  });
  const clinicalAdminController = createClinicalAdminController(clinicalContainer);
  const clinicalMeController = createClinicalMeController(clinicalContainer);
  app.use('/api/admin/clinical', createClinicalAdminRoutes(clinicalAdminController));
  app.use('/api/clinical/me', createClinicalMeRoutes(clinicalMeController));

  // The data subject's rights: download my data, consultas y reclamos with
  // a radicado, and the club's inbox with the legal deadlines.
  const privacyContainer = buildPrivacyContainer({
    personDirectory: createIdentityPersonDirectory({
      getUserSummaries: identityContainer.getUserSummaries,
    }),
    accountEraser: createAccountEraser({
      eraseMemberContent: communityContainer.eraseMemberContent,
      anonymizeAccount: identityContainer.anonymizeAccount,
    }),
  });
  const privacyController = createPrivacyController(privacyContainer);
  app.use('/api/privacy/me', createPrivacyMeRoutes(privacyController));
  app.use('/api/admin/privacy', createPrivacyAdminRoutes(privacyController));

  // "Solicitar información": public form and the front desk's inbox.
  const inquiriesController = createInquiriesController(buildInquiriesContainer());
  app.use('/api/info-requests', createPublicInquiriesRoutes(inquiriesController));
  app.use('/api/admin/info-requests', createAdminInquiriesRoutes(inquiriesController));

  // Other module routers are mounted here as each module is implemented.

  // Production only: the frontend's built assets are served by this same
  // process (single Render web service, same origin as /api -- no CORS,
  // no LAN-IP drift). Dev keeps using Vite's own server + proxy instead.
  // The GET-only, /api-and-/uploads-excluding fallback lets React Router
  // handle any other path client-side (e.g. a deep link or a page refresh).
  if (config.isProduction) {
    const FRONTEND_DIST_DIR = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../frontend/dist',
    );
    app.use(express.static(FRONTEND_DIST_DIR));
    app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
      res.sendFile(path.join(FRONTEND_DIST_DIR, 'index.html'));
    });
  }

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
    const { status, body } = toProblemDetail(toBodyParserHttpError(err));
    if (status >= 500) {
      req.log?.error({ err: errorForLog(err) }, 'Unhandled error');
    }
    res.status(status).json(body);
  });

  return app;
}
