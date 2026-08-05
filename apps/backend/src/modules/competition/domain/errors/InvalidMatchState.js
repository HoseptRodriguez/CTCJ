import { DomainError } from './DomainError.js';

/** Thrown when void() is called on a match that isn't RECORDED (already
 * voided) -- one parametrized error, not one class per action, mirrors
 * billing's InvalidInvoiceState exactly. */
export class InvalidMatchState extends DomainError {
  constructor(currentStatus, attemptedAction) {
    super('invalid_match_state', `Cannot ${attemptedAction} a match in status ${currentStatus}.`);
    this.currentStatus = currentStatus;
    this.attemptedAction = attemptedAction;
  }
}
