/**
 * Booking's own narrow window into identity's membership-status concept.
 * Booking's application/domain layers depend on nothing else from identity
 * -- the concrete adapter (infrastructure/adapters/membershipStatusProviderAdapter.js)
 * is the only place allowed to know identity exists.
 */
export class MembershipStatusProvider {
  /** @returns {Promise<string|null>} one of MEMBERSHIP_STATUS, or null (no membership record / not applicable) */
  async getStatus(_userId) {
    throw new Error('Not implemented');
  }
}
