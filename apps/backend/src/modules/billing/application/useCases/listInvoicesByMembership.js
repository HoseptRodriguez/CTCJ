/** @param {{ invoiceRepository: import('../ports/InvoiceRepository.js').InvoiceRepository }} deps */
export function createListInvoicesByMembership({ invoiceRepository }) {
  /** @param {{ membershipId: string }} input */
  return async function listInvoicesByMembership({ membershipId }) {
    return invoiceRepository.listByMembership(membershipId);
  };
}
