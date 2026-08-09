/**
 * Community's own narrow window into identity's player-name lookup -- own
 * copy convention, matches challenges'/competition's identical port. Never
 * returns email -- this is peer-facing display enrichment (post/comment
 * author names), not a staff-facing lookup.
 */
export class PlayerDirectoryProvider {
  /** @param {string[]} userIds
   * @returns {Promise<Map<string, {firstName: string, lastName: string}>>} */
  async getPlayerSummaries(_userIds) {
    throw new Error('Not implemented');
  }
}
