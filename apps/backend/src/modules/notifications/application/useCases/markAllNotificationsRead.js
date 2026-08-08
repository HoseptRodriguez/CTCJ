/**
 * @param {{
 *   notificationRepository: import('../ports/NotificationRepository.js').NotificationRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createMarkAllNotificationsRead({ notificationRepository, clock }) {
  /** @param {{ recipientId: string }} input */
  return async function markAllNotificationsRead({ recipientId }) {
    await notificationRepository.markAllRead(recipientId, clock.now());
    return { ok: true };
  };
}
