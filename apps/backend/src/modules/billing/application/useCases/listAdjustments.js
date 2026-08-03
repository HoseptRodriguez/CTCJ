import { MembershipNotFound } from '../errors/MembershipNotFound.js';

/**
 * @param {{
 *   adjustmentRepository: import('../ports/AdjustmentRepository.js').AdjustmentRepository,
 *   membershipRepository: import('../ports/MembershipRepository.js').MembershipRepository,
 * }} deps
 */
export function createListAdjustments({ adjustmentRepository, membershipRepository }) {
  /**
   * @param {{ membershipId: string }} input
   */
  return async function listAdjustments({ membershipId }) {
    const membership = await membershipRepository.findById(membershipId);
    if (!membership) {
      throw new MembershipNotFound();
    }
    return adjustmentRepository.listByMembership(membershipId);
  };
}
