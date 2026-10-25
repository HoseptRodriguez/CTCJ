import { CONSENT_TYPE } from '@ctcj/shared';

/**
 * Clinical's view of identity's optional authorizations (application layer
 * only, like playerEligibilityProviderAdapter.js).
 *
 * @param {{ hasAuthorizationInForce: (input: { userId: string, type: string }) => Promise<boolean> }} deps
 * @returns {import('../../application/ports/HealthAuthorizationProvider.js').HealthAuthorizationProvider}
 */
export function createIdentityHealthAuthorizationProvider({ hasAuthorizationInForce }) {
  return {
    async hasHealthAuthorization(playerId) {
      return hasAuthorizationInForce({ userId: playerId, type: CONSENT_TYPE.HEALTH_DATA });
    },
  };
}
