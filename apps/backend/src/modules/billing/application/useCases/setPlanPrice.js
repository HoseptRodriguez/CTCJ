import { supersedePrice } from '../../domain/services/supersedePrice.js';
import { PlanNotFound } from '../errors/PlanNotFound.js';

/**
 * @param {{ planRepository: import('../ports/PlanRepository.js').PlanRepository }} deps
 */
export function createSetPlanPrice({ planRepository }) {
  /**
   * @param {{ planId: string, basePriceCop: number, validFrom: Date, createdByUserId: string }} input
   */
  return async function setPlanPrice({ planId, basePriceCop, validFrom, createdByUserId }) {
    const plan = await planRepository.findById(planId);
    if (!plan) {
      throw new PlanNotFound();
    }

    const currentVigentePrice = await planRepository.findCurrentPrice(planId);
    const { closePrevious, newRow } = supersedePrice(currentVigentePrice, {
      basePriceCop,
      validFrom,
    }); // throws InvalidPriceValidFrom / NegativePrice

    return planRepository.supersedePrice(planId, {
      closePrevious,
      newRow,
      createdBy: createdByUserId,
    });
  };
}
