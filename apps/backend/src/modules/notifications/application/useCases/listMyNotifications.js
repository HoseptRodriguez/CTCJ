const DEFAULT_LIMIT = 20;

/**
 * Self-service: the caller's own recent notifications plus an unread count
 * -- the count is a separate query rather than `.filter(...).length` on the
 * capped recent list, since a user could have more unread notifications
 * than fit in the `limit` recent ones.
 *
 * @param {{ notificationRepository: import('../ports/NotificationRepository.js').NotificationRepository }} deps
 */
export function createListMyNotifications({ notificationRepository }) {
  /** @param {{ recipientId: string, limit?: number }} input */
  return async function listMyNotifications({ recipientId, limit = DEFAULT_LIMIT }) {
    const [notifications, unreadCount] = await Promise.all([
      notificationRepository.listByRecipient(recipientId, limit),
      notificationRepository.countUnreadByRecipient(recipientId),
    ]);
    return { notifications, unreadCount };
  };
}
