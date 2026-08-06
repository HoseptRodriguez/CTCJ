/**
 * Tournament's own narrow window into identity's user-directory concept,
 * used to enrich bracket views with player names. Own copy, not shared
 * with billing's/competition's identically-shaped port.
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
