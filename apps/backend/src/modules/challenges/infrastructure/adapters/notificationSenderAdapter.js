/**
 * The one place challenges' infrastructure is allowed to know the
 * notifications module exists. Imports notifications' application layer (a
 * plain use-case function), never its persistence -- legal under
 * .dependency-cruiser.js's rules. The only cross-module *write* dependency
 * challenges has (every other adapter here is a read), but the shape is
 * identical: accept the already-built use-case function as a dependency,
 * app.js wires `notificationsContainer.createNotification` in directly.
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
