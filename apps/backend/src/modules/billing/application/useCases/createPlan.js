import { generatePlanCode } from '../../domain/services/planCode.js';
import { PlanNameAlreadyExists } from '../errors/PlanNameAlreadyExists.js';

/**
 * @param {{
 *   planRepository: import('../ports/PlanRepository.js').PlanRepository,
 *   auditLog: import('../ports/BillingAuditLog.js').BillingAuditLog,
 *   clubId: string,
 * }} deps
 */
export function createCreatePlan({ planRepository, auditLog, clubId }) {
  /**
   * The code is generated from the name, once; it never changes afterwards.
   * @param {{ name: string, description?: string|null, actorUserId: string, actorRoles?: string[] }} input
   */
  return async function createPlan({ name, description, actorUserId, actorRoles = [] }) {
    const cleanName = name.trim();
    if (await planRepository.findByName(clubId, cleanName)) {
      throw new PlanNameAlreadyExists(cleanName);
    }
    const code = generatePlanCode(cleanName, new Set(await planRepository.listCodes(clubId)));
    const plan = await planRepository.create({
      clubId,
      code,
      name: cleanName,
      description: description?.trim() || null,
    });
    await auditLog.record({
      actorUserId,
      actorRoles,
      action: 'PLAN_CREATED',
      entityType: 'MembershipPlan',
      entityId: plan.id,
      after: { code: plan.code, name: plan.name, description: plan.description },
    });
    return plan;
  };
}
