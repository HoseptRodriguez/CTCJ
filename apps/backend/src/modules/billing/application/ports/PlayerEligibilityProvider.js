/**
 * Billing's own narrow window into identity's role concept. Billing's
 * application/domain layers depend on nothing else from identity -- the
 * concrete adapter (infrastructure/adapters/playerEligibilityProviderAdapter.js)
 * is the only place allowed to know identity exists.
 */
export class PlayerEligibilityProvider {
  /** @returns {Promise<boolean>} true iff userId holds the JUGADOR role */
  async isEligiblePlayer(_userId) {
    throw new Error('Not implemented');
  }
}
