/**
 * Billing's own narrow window into the notifications module's inbox -- the
 * concrete adapter is the only place allowed to know that module exists
 * (same convention as challenges' and community's ports).
 */
export class NotificationSender {
  /**
   * @param {{ recipientId: string, type: string, title: string, body?: string, linkPath?: string }} _notification
   * @returns {Promise<void>}
   */
  async notify(_notification) {
    throw new Error('Not implemented');
  }
}
