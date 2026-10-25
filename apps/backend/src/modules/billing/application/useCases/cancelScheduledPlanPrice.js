import { clubToday, isScheduled } from '../../domain/services/priceSchedule.js';
import { NoScheduledPrice } from '../errors/NoScheduledPrice.js';
import { PlanNotFound } from '../errors/PlanNotFound.js';

/**
 * Cancels a price change that has not started yet (a typo, a change of
 * mind): the price before it simply keeps applying. Nothing was billed with
 * it, so removing it can't alter an invoice; the audit log keeps the trace.
 *
 * @param {{
 *   planRepository: import('../ports/PlanRepository.js').PlanRepository,
 *   auditLog: import('../ports/BillingAuditLog.js').BillingAuditLog,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCancelScheduledPlanPrice({ planRepository, auditLog, clock }) {
  /** @param {{ planId: string, actorUserId: string, actorRoles?: string[] }} input */
  return async function cancelScheduledPlanPrice({ planId, actorUserId, actorRoles = [] }) {
    const plan = await planRepository.findById(planId);
    if (!plan) {
      throw new PlanNotFound();
    }
    const today = clubToday(clock.now());
    const scheduled = await planRepository.findCurrentPrice(planId);
    if (!isScheduled(scheduled, today)) {
      throw new NoScheduledPrice();
    }
    const previous = await planRepository.findPriceAt(planId, today);

    await planRepository.cancelScheduledPrice({
      scheduledId: scheduled.id,
      previousId: previous?.id ?? null,
    });
    await auditLog.record({
      actorUserId,
      actorRoles,
      action: 'PLAN_PRICE_CANCELLED',
      entityType: 'MembershipPlan',
      entityId: planId,
      before: {
        basePriceCop: String(scheduled.basePriceCop),
        validFrom: scheduled.validFrom.toISOString().slice(0, 10),
      },
      after: previous ? { basePriceCop: String(previous.basePriceCop) } : null,
    });
    return { planId, currentPriceCop: previous?.basePriceCop ?? null };
  };
}
