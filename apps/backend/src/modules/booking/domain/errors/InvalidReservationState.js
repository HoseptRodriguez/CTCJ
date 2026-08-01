import { DomainError } from './DomainError.js';

/** Thrown when confirm()/cancel() is called from a status that can't legally transition that way. */
export class InvalidReservationState extends DomainError {
  constructor(currentStatus, attemptedAction) {
    super(
      'invalid_reservation_state',
      `Cannot ${attemptedAction} a reservation in status ${currentStatus}.`,
    );
    this.currentStatus = currentStatus;
    this.attemptedAction = attemptedAction;
  }
}
