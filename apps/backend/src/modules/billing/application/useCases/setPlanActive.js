import { PlanNotFound } from '../errors/PlanNotFound.js';

/**
 * A deactivated plan is no longer offered to new players (enrollPlayer
 * refuses it), but the players already in it keep it, with its price.
 *
 * @param {{
 *   planRepository: import('../ports/PlanRepository.js').PlanRepository,
 *   auditLog: import('../ports/BillingAuditLog.js').BillingAuditLog,
 * }} deps
 */
export function createSetPlanActive({ planRepository, auditLog }) {
  /** @param {{ planId: string, isActive: boolean, actorUserId: string, actorRoles?: string[] }} input */
  return async function setPlanActive({ planId, isActive, actorUserId, actorRoles = [] }) {
    const plan = await planRepository.findById(planId);
    if (!plan) {
      throw new PlanNotFound();
    }
    if (plan.isActive === isActive) {
      return plan;
    }
    const updated = await planRepository.update(planId, { isActive });
    await auditLog.record({
      actorUserId,
      actorRoles,
      action: isActive ? 'PLAN_ACTIVATED' : 'PLAN_DEACTIVATED',
      entityType: 'MembershipPlan',
      entityId: planId,
      before: { isActive: plan.isActive },
      after: { isActive },
    });
    return updated;
  };
}
