import { DomainError } from './DomainError.js';

/** Thrown when a recovery plan transition is attempted from a status that
 * can't legally go there -- mirrors InvalidAppointmentState's shape. */
export class InvalidRecoveryPlanState extends DomainError {
  constructor(currentStatus, attemptedAction) {
    super(
      'invalid_recovery_plan_state',
      `Cannot ${attemptedAction} a recovery plan in status ${currentStatus}.`,
    );
    this.currentStatus = currentStatus;
    this.attemptedAction = attemptedAction;
  }
}
