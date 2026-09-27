/**
 * The one place billing's infrastructure is allowed to know the
 * notifications module exists -- same shape as challenges' and community's
 * adapters: app.js passes `notificationsContainer.createNotification` in.
 *
 * @param {{ createNotification: (input: { recipientId: string, type: string, title: string, body?: string, linkPath?: string }) => Promise<object> }} deps
 * @returns {import('../../application/ports/NotificationSender.js').NotificationSender}
 */
export function createNotificationsSenderAdapter({ createNotification }) {
  return {
    async notify(notification) {
      await createNotification(notification);
    },
  };
}
