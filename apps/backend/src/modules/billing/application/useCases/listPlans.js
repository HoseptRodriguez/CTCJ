/**
 * Each plan enriched with its current (vigente) price, so the admin catalog
 * view never needs a second round-trip per plan.
 *
 * @param {{ planRepository: import('../ports/PlanRepository.js').PlanRepository, clubId: string }} deps
 */
export function createListPlans({ planRepository, clubId }) {
  return async function listPlans() {
    const plans = await planRepository.listByClub(clubId);
    return Promise.all(
      plans.map(async (plan) => {
        const currentPrice = await planRepository.findCurrentPrice(plan.id);
        return { ...plan, currentPriceCop: currentPrice?.basePriceCop ?? null };
      }),
    );
  };
}
