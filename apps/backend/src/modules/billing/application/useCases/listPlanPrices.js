import { PlanNotFound } from '../errors/PlanNotFound.js';

/**
 * Full price history for a plan -- the only place the "changing a price
 * never alters what was billed" invariant is actually verifiable from the UI.
 *
 * @param {{ planRepository: import('../ports/PlanRepository.js').PlanRepository }} deps
 */
export function createListPlanPrices({ planRepository }) {
  /**
   * @param {{ planId: string }} input
   */
  return async function listPlanPrices({ planId }) {
    const plan = await planRepository.findById(planId);
    if (!plan) {
      throw new PlanNotFound();
    }
    return planRepository.listPrices(planId);
  };
}
