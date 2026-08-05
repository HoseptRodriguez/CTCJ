/**
 * Competition's own narrow window into identity's user-directory concept,
 * used to enrich standings/match-history rows with player names -- competition
 * has no name data of its own, only playerId (a User id). Own copy, not
 * shared with billing's identically-shaped port.
 */
export class PlayerDirectoryProvider {
  /**
   * Batch, not per-id -- a standings table with N players would otherwise
   * cost N round-trips. Unknown ids are simply absent from the returned map,
   * not an error.
   * @returns {Promise<Map<string, {firstName: string, lastName: string, email: string}>>}
   */
  async getPlayerSummaries(_userIds) {
    throw new Error('Not implemented');
  }
}
