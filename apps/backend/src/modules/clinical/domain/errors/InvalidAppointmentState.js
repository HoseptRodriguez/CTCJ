import { DomainError } from './DomainError.js';

/** Thrown when an appointment transition is attempted from a status that
 * can't legally go there -- one parametrized error, not one class per
 * action, mirrors booking's InvalidReservationState/competition's
 * InvalidMatchState. */
export class InvalidAppointmentState extends DomainError {
  constructor(currentStatus, attemptedAction) {
    super(
      'invalid_appointment_state',
      `Cannot ${attemptedAction} an appointment in status ${currentStatus}.`,
    );
    this.currentStatus = currentStatus;
    this.attemptedAction = attemptedAction;
  }
}
