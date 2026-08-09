/**
 * Community's own narrow window into the notifications module's inbox
 * concept -- own copy convention still applies: the concrete adapter is
 * the only place allowed to know the notifications module exists. Matches
 * challenges' identical port.
 */
export class NotificationSender {
  /**
   * @param {{ recipientId: string, type: string, title: string, body?: string, linkPath?: string }} notification
   * @returns {Promise<void>}
   */
  async notify(_notification) {
    throw new Error('Not implemented');
  }
}
