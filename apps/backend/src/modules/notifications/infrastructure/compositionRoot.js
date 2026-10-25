import { DEFAULT_CLUB_ID } from '../../../config/club.js';
import { config } from '../../../config/env.js';
import { prisma } from '../../../shared/prismaClient.js';
import { systemClock } from '../application/ports/Clock.js';
import { createAnnouncementUseCases } from '../application/useCases/announcements.js';
import { createCreateNotification } from '../application/useCases/createNotification.js';
import { createEventHandlers } from '../application/useCases/eventHandlers.js';
import { createListMyNotifications } from '../application/useCases/listMyNotifications.js';
import { createMarkAllNotificationsRead } from '../application/useCases/markAllNotificationsRead.js';
import { createMarkNotificationRead } from '../application/useCases/markNotificationRead.js';
import { createNotify } from '../application/useCases/notify.js';
import { createPreferenceUseCases } from '../application/useCases/preferences.js';
import { createProcessOutbox } from '../application/useCases/processOutbox.js';
import { createSendDailyDigests, createSendDueEmails } from '../application/useCases/sendEmails.js';
import { NotificationsError } from '../application/errors/NotificationsError.js';

import { createDigestRenderer } from './email/digestEmail.js';
import { createEmailTransport } from './email/emailTransport.js';
import { createNotificationEmailRenderer } from './email/notificationEmail.js';
import { createPrismaAnnouncementRepository } from './persistence/prismaAnnouncementRepository.js';
import { createPrismaEmailDeliveryRepository } from './persistence/prismaEmailDeliveryRepository.js';
import { createPrismaNotificationPreferenceRepository } from './persistence/prismaNotificationPreferenceRepository.js';
import { createPrismaNotificationRepository } from './persistence/prismaNotificationRepository.js';
import { createPrismaOutboxRepository } from './persistence/prismaOutboxRepository.js';
import { createUnsubscribeTokens } from './security/unsubscribeTokens.js';
import { createAnnouncementImageStorage } from './storage/announcementImages.js';

class UnsubscribeLinkInvalid extends NotificationsError {
  constructor() {
    super('unsubscribe_link_invalid', 'The link is not valid');
  }
}

const NO_CONTACTS = {
  getNotificationContacts: async () => [],
  listNotifiableUserIds: async () => [],
};
const NO_MARKETING = {
  getMarketingPreferences: async () => ({
    isMinor: false,
    givenByGuardian: false,
    matrix: {
      NEW_TOURNAMENTS: { APP: false, EMAIL: false },
      PROMOTIONS: { APP: false, EMAIL: false },
    },
  }),
  setMarketingPreferences: async () => {
    throw new Error('Marketing gateway not wired');
  },
  stopMarketingEmails: async () => {},
};
const NO_AUDIENCE = {
  playerIdsInCategory: async () => [],
  playerIdsInTournament: async () => [],
  tournamentName: async () => null,
};

/**
 * Wires the notifications module. Cross-module needs come in as plain
 * objects built in app.js (the only place modules meet):
 * - contactDirectory, marketingGateway: identity
 * - audienceDirectory: competition (categories) and tournament
 * Without them (other modules' unit tests), notifications stay in the app.
 *
 * @param {{ prismaClient?: object, contactDirectory?: object, marketingGateway?: object,
 *   audienceDirectory?: object, emailTransport?: object, clock?: { now: () => Date },
 *   logger?: object }} [options]
 */
export function buildNotificationsContainer({
  prismaClient = prisma,
  contactDirectory = NO_CONTACTS,
  marketingGateway = NO_MARKETING,
  audienceDirectory = NO_AUDIENCE,
  emailTransport = createEmailTransport({
    nodeEnv: config.nodeEnv,
    resend: config.resend,
    smtp: config.smtp,
  }),
  clock = systemClock,
  logger,
} = {}) {
  const notificationRepository = createPrismaNotificationRepository(prismaClient);
  const preferenceRepository = createPrismaNotificationPreferenceRepository(prismaClient);
  const emailDeliveryRepository = createPrismaEmailDeliveryRepository(prismaClient);
  const announcementRepository = createPrismaAnnouncementRepository(prismaClient);
  const outboxRepository = createPrismaOutboxRepository(prismaClient);
  const unsubscribeTokens = createUnsubscribeTokens({ secret: config.jwt.accessSecret });
  const siteUrl = config.appPublicUrl.replace(/\/$/, '');
  const unsubscribeUrlFor = (userId, category) =>
    `${siteUrl}/notificaciones/baja?t=${encodeURIComponent(unsubscribeTokens.create(userId, category))}`;
  const renderEmail = createNotificationEmailRenderer({ siteUrl, unsubscribeUrlFor });

  const createNotification = createCreateNotification({ notificationRepository });
  const notifyApi = createNotify({
    contactDirectory,
    preferenceRepository,
    marketingGateway,
    emailDeliveryRepository,
    createNotification,
    renderEmail,
    clock,
  });
  const preferences = createPreferenceUseCases({ preferenceRepository, marketingGateway });
  const announcements = createAnnouncementUseCases({
    announcementRepository,
    emailDeliveryRepository,
    contactDirectory,
    audienceDirectory,
    notifyApi,
    renderEmail,
    clock,
    clubId: DEFAULT_CLUB_ID,
  });
  const handlers = createEventHandlers({
    notify: notifyApi.notify,
    contactDirectory,
    dispatchAnnouncement: announcements.dispatchAnnouncement,
  });

  // RFC 8058 one-click unsubscribe header, for promotional emails only.
  const apiUrl = config.apiPublicUrl.replace(/\/$/, '');
  const headersFor = (delivery) =>
    delivery.kind === 'PROMOTIONAL' && apiUrl && delivery.recipientUserId
      ? {
          'List-Unsubscribe': `<${apiUrl}/api/notifications/unsubscribe?t=${encodeURIComponent(
            unsubscribeTokens.create(delivery.recipientUserId, delivery.category),
          )}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }
      : {};

  const imageStorage = createAnnouncementImageStorage({ blobToken: config.blob.readWriteToken });

  return {
    createNotification,
    listMyNotifications: createListMyNotifications({ notificationRepository }),
    markNotificationRead: createMarkNotificationRead({ notificationRepository, clock }),
    markAllNotificationsRead: createMarkAllNotificationsRead({ notificationRepository, clock }),

    ...preferences,
    notify: notifyApi.notify,
    planNotification: notifyApi.plan,

    /** "Dejar de recibir estos correos", from the signed link. */
    async unsubscribe({ token }) {
      const parsed = unsubscribeTokens.verify(token);
      if (!parsed) throw new UnsubscribeLinkInvalid();
      return preferences.stopEmails(parsed);
    },
    unsubscribeTokens,

    ...announcements,
    async uploadAnnouncementImage({ buffer }) {
      const processed = await imageStorage.process(buffer);
      return { url: await imageStorage.save(processed) };
    },

    processOutbox: createProcessOutbox({ outboxRepository, handlers, clock, logger }),
    sendDueEmails: createSendDueEmails({
      emailDeliveryRepository,
      emailTransport,
      limits: config.emailLimits,
      headersFor,
      clock,
    }),
    sendDailyDigests: createSendDailyDigests({
      emailDeliveryRepository,
      renderDigest: createDigestRenderer({ siteUrl }),
      clock,
    }),
    markEmailOpened: ({ providerMessageId, openedAt }) =>
      emailDeliveryRepository.markOpened(providerMessageId, openedAt),
    emailTransport,
  };
}
