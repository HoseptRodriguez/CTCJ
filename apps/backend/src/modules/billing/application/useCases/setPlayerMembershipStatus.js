import { MembershipNotFound } from '../errors/MembershipNotFound.js';

/**
 * @param {{ membershipRepository: import('../ports/MembershipRepository.js').MembershipRepository }} deps
 */
export function createSetPlayerMembershipStatus({ membershipRepository }) {
  /**
   * @param {{ membershipId: string, status: 'ACTIVE'|'SUSPENDED'|'ENDED', endDate?: Date }} input
   */
  return async function setPlayerMembershipStatus({ membershipId, status, endDate }) {
    const membership = await membershipRepository.findById(membershipId);
    if (!membership) {
      throw new MembershipNotFound();
    }

    if (status === 'ACTIVE') {
      membership.activate();
    } else if (status === 'SUSPENDED') {
      membership.suspend();
    } else {
      membership.end(endDate ?? new Date());
    } // else-branch covers 'ENDED' -- zod already restricts status to the 3 valid values at the HTTP boundary

    return membershipRepository.update(membership);
  };
}
