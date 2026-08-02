import { prisma } from '../../../shared/prismaClient.js';
import { config } from '../../../config/env.js';
import { DEFAULT_CLUB_ID } from '../../../config/club.js';
import { systemClock } from '../application/ports/Clock.js';
import { createRegisterUser } from '../application/useCases/registerUser.js';
import { createLoginUser } from '../application/useCases/loginUser.js';
import { createRefreshSession } from '../application/useCases/refreshSession.js';
import { createVerifyEmail } from '../application/useCases/verifyEmail.js';
import { createLogoutUser } from '../application/useCases/logoutUser.js';
import { createGrantRoleToUser } from '../application/useCases/grantRoleToUser.js';
import { createSetMembershipStatus } from '../application/useCases/setMembershipStatus.js';
import { createGetMembershipStatus } from '../application/useCases/getMembershipStatus.js';
import { createLookupUserByEmail } from '../application/useCases/lookupUserByEmail.js';
import { createGetSystemSetting } from '../application/useCases/getSystemSetting.js';
import { createSetSystemSetting } from '../application/useCases/setSystemSetting.js';

import { createPrismaUserRepository } from './persistence/prismaUserRepository.js';
import { createPrismaRoleRepository } from './persistence/prismaRoleRepository.js';
import { createPrismaRefreshTokenRepository } from './persistence/prismaRefreshTokenRepository.js';
import { createPrismaEmailVerificationRepository } from './persistence/prismaEmailVerificationRepository.js';
import { createPrismaSystemSettingRepository } from './persistence/prismaSystemSettingRepository.js';
import { createArgon2PasswordHasher } from './security/argon2PasswordHasher.js';
import { createJwtTokenService } from './security/jwtTokenService.js';
import { createNodemailerEmailSender } from './email/nodemailerEmailSender.js';

/**
 * Wires concrete infrastructure adapters to application use cases. This is
 * the one place in the identity module allowed to know about every layer at
 * once -- controllers/routes only ever see the returned use-case functions.
 */
export function buildIdentityContainer({ prismaClient = prisma } = {}) {
  const userRepository = createPrismaUserRepository(prismaClient);
  const roleRepository = createPrismaRoleRepository(prismaClient);
  const refreshTokenRepository = createPrismaRefreshTokenRepository(prismaClient);
  const emailVerificationRepository = createPrismaEmailVerificationRepository(prismaClient);
  const systemSettingRepository = createPrismaSystemSettingRepository(prismaClient);
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
    logoutUser: createLogoutUser({ refreshTokenRepository, tokenService }),
    grantRoleToUser: createGrantRoleToUser({ userRepository, roleRepository }),
    setMembershipStatus: createSetMembershipStatus({ userRepository, clock }),
    getMembershipStatus: createGetMembershipStatus({ userRepository }),
    lookupUserByEmail: createLookupUserByEmail({ userRepository, clubId: DEFAULT_CLUB_ID }),
    getSystemSetting: createGetSystemSetting({ systemSettingRepository, clubId: DEFAULT_CLUB_ID }),
    setSystemSetting: createSetSystemSetting({ systemSettingRepository, clubId: DEFAULT_CLUB_ID }),
  };
}
