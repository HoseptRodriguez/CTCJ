/**
 * @param {{ affiliationRequestRepository: import('../ports/AffiliationRequestRepository.js').AffiliationRequestRepository }} deps
 */
export function createGetMyAffiliationRequests({ affiliationRequestRepository }) {
  /**
   * @param {{ userId: string }} input
   */
  return async function getMyAffiliationRequests({ userId }) {
    return affiliationRequestRepository.listByUser(userId);
  };
}
