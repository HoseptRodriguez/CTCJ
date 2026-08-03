/**
 * Each membership enriched with its plan's name and current price, so the
 * admin lookup card and the player's own dashboard never need extra round-trips.
 *
 * @param {{
 *   membershipRepository: import('../ports/MembershipRepository.js').MembershipRepository,
 *   planRepository: import('../ports/PlanRepository.js').PlanRepository,
 * }} deps
 */
export function createListPlayerMemberships({ membershipRepository, planRepository }) {
  /**
   * @param {{ playerId: string }} input
   */
  return async function listPlayerMemberships({ playerId }) {
    const memberships = await membershipRepository.listByPlayer(playerId);
    return Promise.all(
      memberships.map(async (membership) => {
        const plan = await planRepository.findById(membership.planId);
        const currentPrice = plan ? await planRepository.findCurrentPrice(plan.id) : null;
        return {
          id: membership.id,
          playerId: membership.playerId,
          planId: membership.planId,
          planName: plan?.name ?? null,
          currentPriceCop: currentPrice?.basePriceCop ?? null,
          startDate: membership.startDate,
          endDate: membership.endDate,
          billingDay: membership.billingDay,
          frequency: membership.frequency,
          status: membership.status,
        };
      }),
    );
  };
}
