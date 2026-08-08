import { NotificationNotFound } from '../errors/NotificationNotFound.js';

/**
 * @param {{
 *   notificationRepository: import('../ports/NotificationRepository.js').NotificationRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createMarkNotificationRead({ notificationRepository, clock }) {
  /** @param {{ recipientId: string, notificationId: string }} input */
  return async function markNotificationRead({ recipientId, notificationId }) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification || notification.recipientId !== recipientId) {
      throw new NotificationNotFound();
    }
    if (notification.readAt) {
      return notification; // idempotent: already read, no-op
    }
    return notificationRepository.markRead(notificationId, clock.now());
  };
}
