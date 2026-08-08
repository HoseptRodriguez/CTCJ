import { DomainError } from './DomainError.js';

/** Thrown when a goal transition is attempted from a status that can't
 * legally go there -- one parametrized error, not one class per action,
 * mirrors clinical's InvalidAppointmentState precedent. */
export class InvalidGoalState extends DomainError {
  constructor(currentStatus, attemptedAction) {
    super('invalid_goal_state', `Cannot ${attemptedAction} a goal in status ${currentStatus}.`);
    this.currentStatus = currentStatus;
    this.attemptedAction = attemptedAction;
  }
}
