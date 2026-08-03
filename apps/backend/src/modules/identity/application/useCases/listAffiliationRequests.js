import { AFFILIATION_REQUEST_STATUS } from '@ctcj/shared';

/**
 * Enriches each row with the requester's own email/name -- the admin review
 * UI needs to show who is asking, not just an opaque userId.
 *
 * @param {{
 *   affiliationRequestRepository: import('../ports/AffiliationRequestRepository.js').AffiliationRequestRepository,
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 * }} deps
 */
export function createListAffiliationRequests({ affiliationRequestRepository, userRepository }) {
  /**
   * @param {{ status?: string }} input
   */
  return async function listAffiliationRequests({ status } = {}) {
    const rows = await affiliationRequestRepository.listByStatus(
      status ?? AFFILIATION_REQUEST_STATUS.PENDING,
    );
    return Promise.all(
      rows.map(async (row) => {
        const user = await userRepository.findById(row.userId);
        return {
          ...row,
          userEmail: user?.email ?? null,
          userFirstName: user?.firstName ?? null,
          userLastName: user?.lastName ?? null,
        };
      }),
    );
  };
}
