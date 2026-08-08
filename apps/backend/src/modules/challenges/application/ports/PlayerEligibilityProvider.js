/**
 * Challenges' own narrow window into identity's role concept. Own copy, not
 * shared with coaching's/competition's/etc. identically-shaped port -- each
 * module owns its narrow port.
 */
export class PlayerEligibilityProvider {
  /** @returns {Promise<boolean>} true iff userId holds the JUGADOR role */
  async isEligiblePlayer(_userId) {
    throw new Error('Not implemented');
  }
}
