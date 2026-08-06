import { RecoveryPlanNotFound } from '../errors/RecoveryPlanNotFound.js';

/**
 * @param {{
 *   recoveryPlanRepository: import('../ports/RecoveryPlanRepository.js').RecoveryPlanRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createDiscontinueRecoveryPlan({ recoveryPlanRepository, clock }) {
  /** @param {{ planId: string, reason: string, resolvedByUserId: string }} input */
  return async function discontinueRecoveryPlan({ planId, reason, resolvedByUserId }) {
    const plan = await recoveryPlanRepository.findById(planId);
    if (!plan) {
      throw new RecoveryPlanNotFound();
    }

    plan.discontinue({ reason, resolvedBy: resolvedByUserId, now: clock.now() }); // throws InvalidRecoveryPlanState

    return recoveryPlanRepository.update(plan);
  };
}
