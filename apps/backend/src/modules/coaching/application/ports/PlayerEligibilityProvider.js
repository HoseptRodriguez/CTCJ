/**
 * Coaching's own narrow window into identity's role concept. Coaching's
 * application layer depends on nothing else from identity -- the concrete
 * adapter (infrastructure/adapters/playerEligibilityProviderAdapter.js) is
 * the only place allowed to know identity exists. Own copy, not shared with
 * billing's identically-shaped port -- each module owns its narrow port.
 */
export class PlayerEligibilityProvider {
  /** @returns {Promise<boolean>} true iff userId holds the JUGADOR role */
  async isEligiblePlayer(_userId) {
    throw new Error('Not implemented');
  }
}
