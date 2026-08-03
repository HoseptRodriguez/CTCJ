import { MembershipNotFound } from '../errors/MembershipNotFound.js';

/**
 * @param {{
 *   adjustmentRepository: import('../ports/AdjustmentRepository.js').AdjustmentRepository,
 *   membershipRepository: import('../ports/MembershipRepository.js').MembershipRepository,
 * }} deps
 */
export function createAddAdjustment({ adjustmentRepository, membershipRepository }) {
  /**
   * @param {{ membershipId: string, adjustmentType: string, value: number, reason: string, validFrom: Date, validTo?: Date, authorizedByUserId: string }} input
   */
  return async function addAdjustment({
    membershipId,
    adjustmentType,
    value,
    reason,
    validFrom,
    validTo,
    authorizedByUserId,
  }) {
    const membership = await membershipRepository.findById(membershipId);
    if (!membership) {
      throw new MembershipNotFound();
    }

    return adjustmentRepository.create({
      membershipId,
      adjustmentType,
      value,
      reason,
      validFrom,
      validTo: validTo ?? null,
      authorizedBy: authorizedByUserId,
    });
  };
}
