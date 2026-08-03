import { PlanCodeAlreadyExists } from '../errors/PlanCodeAlreadyExists.js';

/**
 * @param {{ planRepository: import('../ports/PlanRepository.js').PlanRepository, clubId: string }} deps
 */
export function createCreatePlan({ planRepository, clubId }) {
  /**
   * @param {{ code: string, name: string, description?: string }} input
   */
  return async function createPlan({ code, name, description }) {
    const existing = await planRepository.findByCode(clubId, code);
    if (existing) {
      throw new PlanCodeAlreadyExists(code);
    }
    return planRepository.create({ clubId, code, name, description: description ?? null });
  };
}
