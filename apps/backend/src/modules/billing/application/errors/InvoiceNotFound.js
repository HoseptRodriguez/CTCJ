import { DomainError } from '../../domain/errors/DomainError.js';

export class InvoiceNotFound extends DomainError {
  constructor() {
    super('invoice_not_found', 'Invoice not found.');
  }
}
