import { InvoiceNotFound } from '../errors/InvoiceNotFound.js';

/**
 * @param {{
 *   invoiceRepository: import('../ports/InvoiceRepository.js').InvoiceRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createRecordInvoicePayment({ invoiceRepository, clock }) {
  /**
   * No amountCop parameter -- the amount paid is always invoice.amountCop,
   * never caller-supplied (mirrors booking's recordPayment precedent).
   * @param {{ invoiceId: string, method: string, notes?: string|null, recordedByUserId: string }} input
   */
  return async function recordInvoicePayment({
    invoiceId,
    method,
    notes = null,
    recordedByUserId,
  }) {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new InvoiceNotFound();
    }

    invoice.pay({ method, notes, paidBy: recordedByUserId, now: clock.now() }); // throws InvalidInvoiceState

    return invoiceRepository.update(invoice);
  };
}
