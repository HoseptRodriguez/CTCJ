import { RecoveryPlanNotFound } from '../errors/RecoveryPlanNotFound.js';

/**
 * @param {{
 *   recoveryPlanRepository: import('../ports/RecoveryPlanRepository.js').RecoveryPlanRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCompleteRecoveryPlan({ recoveryPlanRepository, clock }) {
  /** @param {{ planId: string, resolvedByUserId: string }} input */
  return async function completeRecoveryPlan({ planId, resolvedByUserId }) {
    const plan = await recoveryPlanRepository.findById(planId);
    if (!plan) {
      throw new RecoveryPlanNotFound();
    }

    plan.complete({ resolvedBy: resolvedByUserId, now: clock.now() }); // throws InvalidRecoveryPlanState

    return recoveryPlanRepository.update(plan);
  };
}
