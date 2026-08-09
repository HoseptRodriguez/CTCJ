/**
 * The one place community's infrastructure is allowed to know the
 * notifications module exists. Imports notifications' application layer (a
 * plain use-case function), never its persistence -- matches challenges'
 * identical adapter exactly: accept the already-built use-case function as
 * a dependency, app.js wires `notificationsContainer.createNotification`
 * in directly.
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
