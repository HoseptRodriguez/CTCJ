/**
 * Booking's own narrow window into identity's guardianship concept.
 * Booking's application/domain layers depend on nothing else from identity
 * -- the concrete adapter (infrastructure/adapters/guardianshipProviderAdapter.js)
 * is the only place allowed to know identity exists.
 */
export class GuardianshipProvider {
  /** @returns {Promise<boolean>} true iff creatorUserId may book on holderUserId's behalf */
  async canBookFor(_creatorUserId, _holderUserId) {
    throw new Error('Not implemented');
  }
}
