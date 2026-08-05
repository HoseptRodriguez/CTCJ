import { DomainError } from './DomainError.js';

/** Thrown when close() is called on a season that isn't OPEN, or a match is
 * recorded against a season that isn't OPEN. */
export class InvalidSeasonState extends DomainError {
  constructor(currentStatus, attemptedAction) {
    super('invalid_season_state', `Cannot ${attemptedAction} a season in status ${currentStatus}.`);
    this.currentStatus = currentStatus;
    this.attemptedAction = attemptedAction;
  }
}
