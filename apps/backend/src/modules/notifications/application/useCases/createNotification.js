import { randomUUID } from 'node:crypto';

/**
 * Never reachable via HTTP -- only other modules call this, through a
 * cross-module port (see challenges' notificationSenderAdapter.js). No
 * validation of `type` against a closed set here: the caller (another
 * module's application layer) is trusted, matching how every other
 * cross-module write in this codebase works (e.g. identity's
 * addRoleGrant is called by use cases, never validated again at this layer).
 *
 * @param {{ notificationRepository: import('../ports/NotificationRepository.js').NotificationRepository }} deps
 */
export function createCreateNotification({ notificationRepository }) {
  /** @param {{ recipientId: string, type: string, title: string, body?: string, linkPath?: string }} input */
  return async function createNotification({ recipientId, type, title, body, linkPath }) {
    return notificationRepository.create({
      id: randomUUID(),
      recipientId,
      type,
      title,
      body: body ?? null,
      linkPath: linkPath ?? null,
    });
  };
}
