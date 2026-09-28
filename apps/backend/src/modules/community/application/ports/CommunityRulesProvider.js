/**
 * Whether the person accepted the Community rules (including the
 * declaration that they have permission from the people who appear in
 * their photos and videos). Identity keeps the proof. Fails closed.
 */
export class CommunityRulesProvider {
  /** @returns {Promise<boolean>} */
  async hasAcceptedRules(_userId) {
    throw new Error('Not implemented');
  }
}
