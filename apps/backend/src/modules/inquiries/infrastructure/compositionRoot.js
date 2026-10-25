import { MARKETING_AUTHORIZATION, PRIVACY_POLICY } from '@ctcj/shared';

import { prisma } from '../../../shared/prismaClient.js';
import { DEFAULT_CLUB_ID } from '../../../config/club.js';
import { config } from '../../../config/env.js';
import { logger, errorForLog } from '../../../shared/logger.js';
import { systemClock } from '../application/ports/Clock.js';
import { createInfoRequestUseCases } from '../application/useCases/infoRequests.js';

import { createPrismaInfoRequestRepository } from './persistence/prismaInfoRequestRepository.js';
import { createHmacFormTokens } from './security/hmacFormTokens.js';
import { createInquiryMailer } from './email/inquiryMailer.js';

/** "Solicitar información": public form + staff inbox. */
export function buildInquiriesContainer({
  prismaClient = prisma,
  clock = systemClock,
  clubId = DEFAULT_CLUB_ID,
  mailer = createInquiryMailer({
    resend: config.resend,
    smtp: config.smtp,
    notifyTo: config.infoRequests.notifyTo,
    appPublicUrl: config.appPublicUrl,
  }),
} = {}) {
  return createInfoRequestUseCases({
    infoRequestRepository: createPrismaInfoRequestRepository(prismaClient),
    formTokens: createHmacFormTokens({ secret: config.jwt.accessSecret }),
    mailer,
    clock,
    clubId,
    privacyVersion: PRIVACY_POLICY.version,
    marketingVersion: MARKETING_AUTHORIZATION.version,
    onMailError: (err) => logger.warn({ err: errorForLog(err) }, 'Info request email not sent'),
  });
}
