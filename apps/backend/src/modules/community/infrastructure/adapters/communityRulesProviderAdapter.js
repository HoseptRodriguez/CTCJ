import { CONSENT_TYPE } from '@ctcj/shared';

/**
 * Community's view of identity's optional authorizations (application layer
 * only, like minorStatusProviderAdapter.js).
 *
 * @param {{ hasAuthorizationInForce: (input: { userId: string, type: string }) => Promise<boolean> }} deps
 * @returns {import('../../application/ports/CommunityRulesProvider.js').CommunityRulesProvider}
 */
export function createIdentityCommunityRulesProvider({ hasAuthorizationInForce }) {
  return {
    async hasAcceptedRules(userId) {
      return hasAuthorizationInForce({ userId, type: CONSENT_TYPE.COMMUNITY_RULES });
    },
  };
}
