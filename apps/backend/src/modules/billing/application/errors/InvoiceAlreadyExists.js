import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by generateInvoice when an invoice already exists for this
 * membership/period -- a clean 409 instead of a raw unique-constraint 500
 * on a double-click or accidental re-generation. */
export class InvoiceAlreadyExists extends DomainError {
  constructor() {
    super(
      'invoice_already_exists',
      'An invoice already exists for this membership and billing period.',
    );
  }
}
