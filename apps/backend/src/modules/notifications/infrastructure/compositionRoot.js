import { prisma } from '../../../shared/prismaClient.js';
import { systemClock } from '../application/ports/Clock.js';
import { createCreateNotification } from '../application/useCases/createNotification.js';
import { createListMyNotifications } from '../application/useCases/listMyNotifications.js';
import { createMarkNotificationRead } from '../application/useCases/markNotificationRead.js';
import { createMarkAllNotificationsRead } from '../application/useCases/markAllNotificationsRead.js';

import { createPrismaNotificationRepository } from './persistence/prismaNotificationRepository.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * goals'/coaching's compositionRoot.js exactly for consistency. No
 * cross-module dependencies of its own -- other modules (challenges) call
 * `createNotification` through their own NotificationSender port, pointed
 * at this container's function, never at this module's persistence.
 */
export function buildNotificationsContainer({ prismaClient = prisma } = {}) {
  const notificationRepository = createPrismaNotificationRepository(prismaClient);
  const clock = systemClock;

  return {
    createNotification: createCreateNotification({ notificationRepository }),
    listMyNotifications: createListMyNotifications({ notificationRepository }),
    markNotificationRead: createMarkNotificationRead({ notificationRepository, clock }),
    markAllNotificationsRead: createMarkAllNotificationsRead({ notificationRepository, clock }),
  };
}
