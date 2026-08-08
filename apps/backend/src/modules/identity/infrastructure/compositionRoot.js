import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '../../../shared/prismaClient.js';
import { config } from '../../../config/env.js';
import { DEFAULT_CLUB_ID } from '../../../config/club.js';
import { systemClock } from '../application/ports/Clock.js';
import { createRegisterUser } from '../application/useCases/registerUser.js';
import { createLoginUser } from '../application/useCases/loginUser.js';
import { createRefreshSession } from '../application/useCases/refreshSession.js';
import { createVerifyEmail } from '../application/useCases/verifyEmail.js';
import { createRequestPasswordReset } from '../application/useCases/requestPasswordReset.js';
import { createConfirmPasswordReset } from '../application/useCases/confirmPasswordReset.js';
import { createLogoutUser } from '../application/useCases/logoutUser.js';
import { createGrantRoleToUser } from '../application/useCases/grantRoleToUser.js';
import { createSetMembershipStatus } from '../application/useCases/setMembershipStatus.js';
import { createGetMembershipStatus } from '../application/useCases/getMembershipStatus.js';
import { createGetMyProfile } from '../application/useCases/getMyProfile.js';
import { createUpdateMyProfile } from '../application/useCases/updateMyProfile.js';
import { createUploadMyAvatar } from '../application/useCases/uploadMyAvatar.js';
import { createGetPlayerCounts } from '../application/useCases/getPlayerCounts.js';
import { createLookupUserByEmail } from '../application/useCases/lookupUserByEmail.js';
import { createGetSystemSetting } from '../application/useCases/getSystemSetting.js';
import { createSetSystemSetting } from '../application/useCases/setSystemSetting.js';
import { createRequestAffiliation } from '../application/useCases/requestAffiliation.js';
import { createDecideAffiliationRequest } from '../application/useCases/decideAffiliationRequest.js';
import { createListAffiliationRequests } from '../application/useCases/listAffiliationRequests.js';
import { createGetMyAffiliationRequests } from '../application/useCases/getMyAffiliationRequests.js';
import { createRequestGuardianship } from '../application/useCases/requestGuardianship.js';
import { createDecideGuardianship } from '../application/useCases/decideGuardianship.js';
import { createListGuardianships } from '../application/useCases/listGuardianships.js';
import { createListMyGuardianships } from '../application/useCases/listMyGuardianships.js';
import { createCanBookForMinor } from '../application/useCases/canBookForMinor.js';
import { createCheckIsJugador } from '../application/useCases/checkIsJugador.js';
import { createCheckHasAnyRole } from '../application/useCases/checkHasAnyRole.js';
import { createGetUserSummaries } from '../application/useCases/getUserSummaries.js';
import { createSearchPlayers } from '../application/useCases/searchPlayers.js';
import { createGetMyAchievements } from '../application/useCases/getMyAchievements.js';

import { createPrismaUserRepository } from './persistence/prismaUserRepository.js';
import { createPrismaRoleRepository } from './persistence/prismaRoleRepository.js';
import { createPrismaRefreshTokenRepository } from './persistence/prismaRefreshTokenRepository.js';
import { createPrismaEmailVerificationRepository } from './persistence/prismaEmailVerificationRepository.js';
import { createPrismaPasswordResetRepository } from './persistence/prismaPasswordResetRepository.js';
import { createPrismaSystemSettingRepository } from './persistence/prismaSystemSettingRepository.js';
import { createPrismaAffiliationRequestRepository } from './persistence/prismaAffiliationRequestRepository.js';
import { createPrismaGuardianshipRepository } from './persistence/prismaGuardianshipRepository.js';
import { createArgon2PasswordHasher } from './security/argon2PasswordHasher.js';
import { createJwtTokenService } from './security/jwtTokenService.js';
import { createNodemailerEmailSender } from './email/nodemailerEmailSender.js';
import { createLocalDiskAvatarStorage } from './storage/localDiskAvatarStorage.js';
import {
  createNullCompetitionProgressProvider,
  createNullPerformanceProgressProvider,
  createNullTrainingFrequencyProvider,
} from './adapters/nullAdapters.js';

// apps/backend/src/modules/identity/infrastructure -> apps/backend/uploads/avatars
const AVATAR_UPLOADS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../uploads/avatars',
);

/**
 * Wires concrete infrastructure adapters to application use cases. This is
 * the one place in the identity module allowed to know about every layer at
 * once -- controllers/routes only ever see the returned use-case functions.
 */
export function buildIdentityContainer({
  prismaClient = prisma,
  competitionProgressProvider = createNullCompetitionProgressProvider(),
  performanceProgressProvider = createNullPerformanceProgressProvider(),
  trainingFrequencyProvider = createNullTrainingFrequencyProvider(),
} = {}) {
  const userRepository = createPrismaUserRepository(prismaClient);
  const roleRepository = createPrismaRoleRepository(prismaClient);
  const refreshTokenRepository = createPrismaRefreshTokenRepository(prismaClient);
  const emailVerificationRepository = createPrismaEmailVerificationRepository(prismaClient);
  const passwordResetRepository = createPrismaPasswordResetRepository(prismaClient);
  const systemSettingRepository = createPrismaSystemSettingRepository(prismaClient);
  const affiliationRequestRepository = createPrismaAffiliationRequestRepository(prismaClient);
  const guardianshipRepository = createPrismaGuardianshipRepository(prismaClient);
  const passwordHasher = createArgon2PasswordHasher();
  const tokenService = createJwtTokenService({
    accessSecret: config.jwt.accessSecret,
    accessTtlSeconds: config.jwt.accessTtlSeconds,
  });
  const emailSender = createNodemailerEmailSender({
    host: config.smtp.host,
    port: config.smtp.port,
    user: config.smtp.user,
    password: config.smtp.password,
    from: config.smtp.from,
  });
  const avatarStorage = createLocalDiskAvatarStorage({
    uploadsDir: AVATAR_UPLOADS_DIR,
    publicPath: '/uploads/avatars',
  });
  const clock = systemClock;
  const refreshTokenTtlMs = config.refreshToken.ttlDays * 24 * 60 * 60 * 1000;

  return {
    registerUser: createRegisterUser({
      userRepository,
      passwordHasher,
      tokenService,
      emailVerificationRepository,
      emailSender,
      clock,
      clubId: DEFAULT_CLUB_ID,
      appPublicUrl: config.appPublicUrl,
    }),
    loginUser: createLoginUser({
      userRepository,
      passwordHasher,
      tokenService,
      refreshTokenRepository,
      clock,
      clubId: DEFAULT_CLUB_ID,
      refreshTokenTtlMs,
    }),
    refreshSession: createRefreshSession({
      refreshTokenRepository,
      userRepository,
      tokenService,
      clock,
      refreshTokenTtlMs,
    }),
    verifyEmail: createVerifyEmail({
      emailVerificationRepository,
      userRepository,
      tokenService,
      clock,
    }),
    requestPasswordReset: createRequestPasswordReset({
      userRepository,
      passwordResetRepository,
      tokenService,
      emailSender,
      clock,
      clubId: DEFAULT_CLUB_ID,
      appPublicUrl: config.appPublicUrl,
    }),
    confirmPasswordReset: createConfirmPasswordReset({
      passwordResetRepository,
      userRepository,
      passwordHasher,
      tokenService,
      refreshTokenRepository,
      clock,
    }),
    logoutUser: createLogoutUser({ refreshTokenRepository, tokenService }),
    grantRoleToUser: createGrantRoleToUser({ userRepository, roleRepository }),
    setMembershipStatus: createSetMembershipStatus({ userRepository, clock }),
    getMyProfile: createGetMyProfile({ userRepository }),
    getMyAchievements: createGetMyAchievements({
      competitionProgressProvider,
      performanceProgressProvider,
      trainingFrequencyProvider,
    }),
    updateMyProfile: createUpdateMyProfile({ userRepository }),
    uploadMyAvatar: createUploadMyAvatar({ userRepository, avatarStorage }),
    getPlayerCounts: createGetPlayerCounts({ userRepository, clubId: DEFAULT_CLUB_ID }),
    getMembershipStatus: createGetMembershipStatus({ userRepository }),
    lookupUserByEmail: createLookupUserByEmail({ userRepository, clubId: DEFAULT_CLUB_ID }),
    getSystemSetting: createGetSystemSetting({ systemSettingRepository, clubId: DEFAULT_CLUB_ID }),
    setSystemSetting: createSetSystemSetting({ systemSettingRepository, clubId: DEFAULT_CLUB_ID }),
    requestAffiliation: createRequestAffiliation({ userRepository, affiliationRequestRepository }),
    decideAffiliationRequest: createDecideAffiliationRequest({
      userRepository,
      affiliationRequestRepository,
      clock,
    }),
    listAffiliationRequests: createListAffiliationRequests({
      affiliationRequestRepository,
      userRepository,
    }),
    getMyAffiliationRequests: createGetMyAffiliationRequests({ affiliationRequestRepository }),
    requestGuardianship: createRequestGuardianship({
      userRepository,
      guardianshipRepository,
      clubId: DEFAULT_CLUB_ID,
    }),
    decideGuardianship: createDecideGuardianship({ userRepository, guardianshipRepository, clock }),
    listGuardianships: createListGuardianships({ guardianshipRepository, userRepository }),
    listMyGuardianships: createListMyGuardianships({ guardianshipRepository, userRepository }),
    canBookForMinor: createCanBookForMinor({ guardianshipRepository }),
    checkIsJugador: createCheckIsJugador({ userRepository }),
    checkHasAnyRole: createCheckHasAnyRole({ userRepository }),
    getUserSummaries: createGetUserSummaries({ userRepository }),
    searchPlayers: createSearchPlayers({ userRepository, clubId: DEFAULT_CLUB_ID }),
  };
}
