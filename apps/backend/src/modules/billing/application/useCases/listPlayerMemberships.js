import { clubToday, isScheduled } from '../../domain/services/priceSchedule.js';
import { systemClock } from '../ports/Clock.js';

/**
 * Each membership enriched with its plan's name, the price in effect today
 * and, if one is waiting, the upcoming price and when it starts -- so the
 * admin lookup card and the player's own dashboard never need extra round-trips.
 *
 * @param {{
 *   membershipRepository: import('../ports/MembershipRepository.js').MembershipRepository,
 *   planRepository: import('../ports/PlanRepository.js').PlanRepository,
 *   clock?: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createListPlayerMemberships({
  membershipRepository,
  planRepository,
  clock = systemClock,
}) {
  /**
   * @param {{ playerId: string }} input
   */
  return async function listPlayerMemberships({ playerId }) {
    const memberships = await membershipRepository.listByPlayer(playerId);
    const today = clubToday(clock.now());
    return Promise.all(
      memberships.map(async (membership) => {
        const plan = await planRepository.findById(membership.planId);
        const currentPrice = plan ? await planRepository.findPriceAt(plan.id, today) : null;
        const latest = plan ? await planRepository.findCurrentPrice(plan.id) : null;
        const upcoming = isScheduled(latest, today) ? latest : null;
        return {
          id: membership.id,
          playerId: membership.playerId,
          planId: membership.planId,
          planName: plan?.name ?? null,
          currentPriceCop: currentPrice?.basePriceCop ?? null,
          upcomingPriceCop: upcoming?.basePriceCop ?? null,
          upcomingPriceFrom: upcoming?.validFrom ?? null,
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
