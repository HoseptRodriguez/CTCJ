import { DomainError } from './DomainError.js';

/** Thrown when pay()/cancel() is called from a status that can't legally
 * transition that way. One parametrized error, not one class per action --
 * mirrors booking's InvalidReservationState exactly. */
export class InvalidInvoiceState extends DomainError {
  constructor(currentStatus, attemptedAction) {
    super(
      'invalid_invoice_state',
      `Cannot ${attemptedAction} an invoice in status ${currentStatus}.`,
    );
    this.currentStatus = currentStatus;
    this.attemptedAction = attemptedAction;
  }
}
