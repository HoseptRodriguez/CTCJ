import { DomainError } from './DomainError.js';

/** Thrown when a tournament transition is attempted from a status that
 * can't legally go there -- one parametrized error, not one class per
 * action, mirrors competition's InvalidSeasonState/InvalidMatchState. */
export class InvalidTournamentState extends DomainError {
  constructor(currentStatus, attemptedAction) {
    super(
      'invalid_tournament_state',
      `Cannot ${attemptedAction} a tournament in status ${currentStatus}.`,
    );
    this.currentStatus = currentStatus;
    this.attemptedAction = attemptedAction;
  }
}
