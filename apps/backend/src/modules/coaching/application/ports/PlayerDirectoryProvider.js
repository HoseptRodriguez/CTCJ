/**
 * Coaching's own narrow window into identity's user-directory concept, used
 * to enrich the Coach Dashboard's recent-activity feed with player names --
 * coaching has no name data of its own, only playerId (a User id). Own
 * copy, not shared with competition's/billing's identically-shaped port.
 */
export class PlayerDirectoryProvider {
  /**
   * Batch, not per-id. Unknown ids are simply absent from the returned map,
   * not an error.
   * @returns {Promise<Map<string, {firstName: string, lastName: string, email: string}>>}
   */
  async getPlayerSummaries(_userIds) {
    throw new Error('Not implemented');
  }
}
