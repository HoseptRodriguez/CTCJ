import { DomainError } from './DomainError.js';

/** Thrown when a medical history entry transition is attempted from a
 * status that can't legally go there -- mirrors InvalidAppointmentState's
 * shape. */
export class InvalidMedicalHistoryEntryState extends DomainError {
  constructor(currentStatus, attemptedAction) {
    super(
      'invalid_medical_history_entry_state',
      `Cannot ${attemptedAction} a medical history entry in status ${currentStatus}.`,
    );
    this.currentStatus = currentStatus;
    this.attemptedAction = attemptedAction;
  }
}
