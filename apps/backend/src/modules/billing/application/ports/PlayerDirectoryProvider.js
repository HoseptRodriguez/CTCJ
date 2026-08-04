/**
 * Billing's own narrow window into identity's user-directory concept, used
 * to enrich club-wide invoice listings (Phase 9) with player names/emails --
 * billing has no name/email data of its own, only playerId (a User id).
 * Billing's application/domain layers depend on nothing else from identity --
 * the concrete adapter (infrastructure/adapters/playerDirectoryProviderAdapter.js)
 * is the only place allowed to know identity exists.
 */
export class PlayerDirectoryProvider {
  /**
   * Batch, not per-id -- a cartera list of N pending invoices would otherwise
   * cost N round-trips. Unknown ids are simply absent from the returned map,
   * not an error.
   * @returns {Promise<Map<string, {firstName: string, lastName: string, email: string}>>}
   */
  async getPlayerSummaries(_userIds) {
    throw new Error('Not implemented');
  }
}
