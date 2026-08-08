export class NotificationRepository {
  /** @returns {Promise<object>} the created row */
  async create(_notification) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<object|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Recent, newest-first. @returns {Promise<object[]>} */
  async listByRecipient(_recipientId, _limit) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<number>} */
  async countUnreadByRecipient(_recipientId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<object>} the updated row */
  async markRead(_id, _now) {
    throw new Error('Not implemented');
  }

  /** Marks every unread notification for this recipient read in one write. */
  async markAllRead(_recipientId, _now) {
    throw new Error('Not implemented');
  }
}
