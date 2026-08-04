/**
 * Self-service: the caller's own memberships' invoices, scoped by the HTTP
 * controller to req.user.id, never client-supplied -- mirrors
 * getMyPlayerMemberships's scoping pattern.
 *
 * @param {{
 *   membershipRepository: import('../ports/MembershipRepository.js').MembershipRepository,
 *   invoiceRepository: import('../ports/InvoiceRepository.js').InvoiceRepository,
 * }} deps
 */
export function createGetMyInvoices({ membershipRepository, invoiceRepository }) {
  /** @param {{ playerId: string }} input */
  return async function getMyInvoices({ playerId }) {
    const memberships = await membershipRepository.listByPlayer(playerId);
    const invoicesByMembership = await Promise.all(
      memberships.map((membership) => invoiceRepository.listByMembership(membership.id)),
    );
    return invoicesByMembership.flat();
  };
}
