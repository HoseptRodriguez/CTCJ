import { buildInvoiceLines } from '../../domain/services/buildInvoiceLines.js';
import { MembershipNotFound } from '../errors/MembershipNotFound.js';
import { MembershipNotActive } from '../errors/MembershipNotActive.js';
import { PlanPriceNotSet } from '../errors/PlanPriceNotSet.js';
import { InvoiceAlreadyExists } from '../errors/InvoiceAlreadyExists.js';

/**
 * @param {{
 *   membershipRepository: import('../ports/MembershipRepository.js').MembershipRepository,
 *   planRepository: import('../ports/PlanRepository.js').PlanRepository,
 *   adjustmentRepository: import('../ports/AdjustmentRepository.js').AdjustmentRepository,
 *   invoiceRepository: import('../ports/InvoiceRepository.js').InvoiceRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createGenerateInvoice({
  membershipRepository,
  planRepository,
  adjustmentRepository,
  invoiceRepository,
  clock,
}) {
  /**
   * @param {{ membershipId: string, periodStart: Date, periodEnd: Date, dueDate: Date, generatedByUserId?: string|null }} input
   */
  return async function generateInvoice({
    membershipId,
    periodStart,
    periodEnd,
    dueDate,
    generatedByUserId = null,
  }) {
    const membership = await membershipRepository.findById(membershipId);
    if (!membership) {
      throw new MembershipNotFound();
    }
    if (membership.status !== 'ACTIVE') {
      throw new MembershipNotActive();
    }

    const existing = await invoiceRepository.findByMembershipAndPeriod(membershipId, periodStart);
    if (existing) {
      throw new InvoiceAlreadyExists();
    }

    const plan = await planRepository.findById(membership.planId);
    const currentPrice = plan ? await planRepository.findCurrentPrice(plan.id) : null;
    if (!currentPrice) {
      throw new PlanPriceNotSet();
    }

    const adjustments = await adjustmentRepository.listByMembership(membershipId);
    const { lines, totalCop } = buildInvoiceLines({
      basePriceCop: currentPrice.basePriceCop,
      adjustments,
      periodStart,
      planName: plan.name,
    });

    return invoiceRepository.create(
      {
        membershipId,
        amountCop: totalCop,
        periodStart,
        periodEnd,
        dueDate,
        issuedAt: clock.now(),
        generatedBy: generatedByUserId,
      },
      lines,
    );
  };
}
