/**
 * Clinical's own narrow window into identity's user-directory concept, used
 * to enrich staff-facing appointment/note listings with player names.
 */
export class PlayerDirectoryProvider {
  /**
   * Batch, not per-id.
   * @returns {Promise<Map<string, {firstName: string, lastName: string, email: string}>>}
   */
  async getPlayerSummaries(_userIds) {
    throw new Error('Not implemented');
  }
}
