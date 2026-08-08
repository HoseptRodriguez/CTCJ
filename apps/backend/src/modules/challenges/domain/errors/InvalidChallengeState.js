import { DomainError } from './DomainError.js';

/** Thrown when a challenge transition is attempted from a status that can't
 * legally go there -- one parametrized error, not one class per action,
 * mirrors goals'/clinical's identical InvalidGoalState/InvalidAppointmentState
 * precedent. */
export class InvalidChallengeState extends DomainError {
  constructor(currentStatus, attemptedAction) {
    super(
      'invalid_challenge_state',
      `Cannot ${attemptedAction} a challenge in status ${currentStatus}.`,
    );
    this.currentStatus = currentStatus;
    this.attemptedAction = attemptedAction;
  }
}
