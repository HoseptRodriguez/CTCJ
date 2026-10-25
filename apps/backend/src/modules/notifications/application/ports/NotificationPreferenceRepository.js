/** Service-notification switches and the daily-digest setting. */
export class NotificationPreferenceRepository {
  /** Rows that exist (a missing row means "on"). @returns {Promise<Array<{ category: string, channel: string, enabled: boolean }>>} */
  async listForUser(_userId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Map<string, Array<{ category: string, channel: string, enabled: boolean }>>>} */
  async listForUsers(_userIds) {
    throw new Error('Not implemented');
  }

  /** Sets each { category, channel, enabled }. */
  async upsertMany(_userId, _rows) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<{ dailyDigest: boolean }>} */
  async getSettings(_userId) {
    throw new Error('Not implemented');
  }

  /** Which of these people chose the daily digest. @returns {Promise<Set<string>>} */
  async digestUserIds(_userIds) {
    throw new Error('Not implemented');
  }

  /** Sets { dailyDigest }. */
  async setSettings(_userId, _settings) {
    throw new Error('Not implemented');
  }
}
