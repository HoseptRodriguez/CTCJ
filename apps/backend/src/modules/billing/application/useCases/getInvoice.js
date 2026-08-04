import { InvoiceNotFound } from '../errors/InvoiceNotFound.js';

/** @param {{ invoiceRepository: import('../ports/InvoiceRepository.js').InvoiceRepository }} deps */
export function createGetInvoice({ invoiceRepository }) {
  /** @param {{ invoiceId: string }} input */
  return async function getInvoice({ invoiceId }) {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new InvoiceNotFound();
    }
    return invoice;
  };
}
