import { createListPlayerMemberships } from './listPlayerMemberships.js';

/**
 * Self-service wrapper over listPlayerMemberships -- same enrichment, scoped
 * to the caller's own id by the HTTP controller, never client-supplied.
 *
 * @param {{
 *   membershipRepository: import('../ports/MembershipRepository.js').MembershipRepository,
 *   planRepository: import('../ports/PlanRepository.js').PlanRepository,
 * }} deps
 */
export function createGetMyPlayerMemberships(deps) {
  const listPlayerMemberships = createListPlayerMemberships(deps);

  /**
   * @param {{ playerId: string }} input
   */
  return async function getMyPlayerMemberships({ playerId }) {
    return listPlayerMemberships({ playerId });
  };
}
