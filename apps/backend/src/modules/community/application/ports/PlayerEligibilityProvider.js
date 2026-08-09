/**
 * Community's own narrow window into identity's JUGADOR-role concept -- own
 * copy convention: every module that needs this defines its own identical
 * port rather than sharing one, even though the shape matches challenges'/
 * goals'/coaching's byte-for-byte.
 */
export class PlayerEligibilityProvider {
  /** @returns {Promise<boolean>} */
  async isEligiblePlayer(_userId) {
    throw new Error('Not implemented');
  }
}
