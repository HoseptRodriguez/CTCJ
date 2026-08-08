/**
 * Challenges' own narrow window into identity's user-directory concept,
 * used to enrich notifications with the other player's name. Own copy, not
 * shared with any other module's identically-shaped port.
 */
export class PlayerDirectoryProvider {
  /**
   * Batch, not per-id. Unknown ids are simply absent from the returned map,
   * not an error.
   * @returns {Promise<Map<string, {firstName: string, lastName: string}>>}
   */
  async getPlayerSummaries(_userIds) {
    throw new Error('Not implemented');
  }
}
