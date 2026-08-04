import { InvoiceNotFound } from '../errors/InvoiceNotFound.js';

/**
 * @param {{
 *   invoiceRepository: import('../ports/InvoiceRepository.js').InvoiceRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCancelInvoice({ invoiceRepository, clock }) {
  /** @param {{ invoiceId: string, cancelledByUserId: string, reason: string }} input */
  return async function cancelInvoice({ invoiceId, cancelledByUserId, reason }) {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new InvoiceNotFound();
    }

    invoice.cancel({ cancelledBy: cancelledByUserId, reason, now: clock.now() }); // throws InvalidInvoiceState

    return invoiceRepository.update(invoice);
  };
}
