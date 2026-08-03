import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';
import { PlanNotActive } from '../errors/PlanNotActive.js';
import { PlanNotFound } from '../errors/PlanNotFound.js';

/**
 * @param {{
 *   membershipRepository: import('../ports/MembershipRepository.js').MembershipRepository,
 *   planRepository: import('../ports/PlanRepository.js').PlanRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 * }} deps
 */
export function createEnrollPlayer({
  membershipRepository,
  planRepository,
  playerEligibilityProvider,
}) {
  /**
   * @param {{ playerId: string, planId: string, startDate: Date, billingDay: number, frequency?: string }} input
   */
  return async function enrollPlayer({ playerId, planId, startDate, billingDay, frequency }) {
    const plan = await planRepository.findById(planId);
    if (!plan) {
      throw new PlanNotFound();
    }
    if (!plan.isActive) {
      throw new PlanNotActive();
    }

    const eligible = await playerEligibilityProvider.isEligiblePlayer(playerId);
    if (!eligible) {
      throw new PlayerNotEligible();
    }

    return membershipRepository.create({
      playerId,
      planId,
      startDate,
      billingDay,
      frequency: frequency ?? 'MONTHLY',
    });
  };
}
