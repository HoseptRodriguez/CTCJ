import { PlanNameAlreadyExists } from '../errors/PlanNameAlreadyExists.js';
import { PlanNotFound } from '../errors/PlanNotFound.js';

/**
 * Name and description only: the code never changes, and the price has its
 * own rules (setPlanPrice).
 *
 * @param {{
 *   planRepository: import('../ports/PlanRepository.js').PlanRepository,
 *   auditLog: import('../ports/BillingAuditLog.js').BillingAuditLog,
 *   clubId: string,
 * }} deps
 */
export function createUpdatePlan({ planRepository, auditLog, clubId }) {
  /**
   * @param {{ planId: string, name: string, description?: string|null,
   *   actorUserId: string, actorRoles?: string[] }} input
   */
  return async function updatePlan({ planId, name, description, actorUserId, actorRoles = [] }) {
    const plan = await planRepository.findById(planId);
    if (!plan) {
      throw new PlanNotFound();
    }
    const cleanName = name.trim();
    const sameName = await planRepository.findByName(clubId, cleanName);
    if (sameName && sameName.id !== planId) {
      throw new PlanNameAlreadyExists(cleanName);
    }
    const changes = {
      name: cleanName,
      description: description === undefined ? plan.description : description?.trim() || null,
    };
    if (changes.name === plan.name && changes.description === plan.description) {
      return plan;
    }
    const updated = await planRepository.update(planId, changes);
    await auditLog.record({
      actorUserId,
      actorRoles,
      action: 'PLAN_UPDATED',
      entityType: 'MembershipPlan',
      entityId: planId,
      before: { name: plan.name, description: plan.description },
      after: changes,
    });
    return updated;
  };
}
