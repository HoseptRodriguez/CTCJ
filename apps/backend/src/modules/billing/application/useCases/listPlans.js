import { clubToday, earliestPriceStart, isScheduled } from '../../domain/services/priceSchedule.js';

/**
 * The plan catalog for administration: each plan with the price in effect
 * today, the change waiting to start (if any), how many players have it
 * and the earliest day a new price could start -- everything the "Editar
 * plan" panel needs to warn before a change, in one round-trip.
 *
 * @param {{
 *   planRepository: import('../ports/PlanRepository.js').PlanRepository,
 *   membershipRepository: import('../ports/MembershipRepository.js').MembershipRepository,
 *   billingSettings: import('../ports/BillingSettings.js').BillingSettings,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 * }} deps
 */
export function createListPlans({
  planRepository,
  membershipRepository,
  billingSettings,
  clock,
  clubId,
}) {
  return async function listPlans() {
    const today = clubToday(clock.now());
    const [plans, noticeDays] = await Promise.all([
      planRepository.listByClub(clubId),
      billingSettings.getPriceNoticeDays(),
    ]);
    return Promise.all(
      plans.map(async (plan) => {
        const [current, latest, playerIds] = await Promise.all([
          planRepository.findPriceAt(plan.id, today),
          planRepository.findCurrentPrice(plan.id),
          membershipRepository.listActivePlayerIdsByPlan(plan.id),
        ]);
        const scheduled = isScheduled(latest, today) ? latest : null;
        return {
          ...plan,
          currentPriceCop: current?.basePriceCop ?? null,
          scheduledPrice: scheduled
            ? { basePriceCop: scheduled.basePriceCop, validFrom: scheduled.validFrom }
            : null,
          activePlayers: playerIds.length,
          earliestPriceStart: earliestPriceStart({
            today,
            hasCurrentPrice: latest != null,
            activePlayers: playerIds.length,
            noticeDays,
          }),
          noticeDays,
        };
      }),
    );
  };
}
