import { DomainError } from './DomainError.js';

/** Thrown when a ChallengeMatchResult transition is attempted from a state
 * that can't legally go there -- one parametrized error, not one class per
 * action, mirrors Challenge's own InvalidChallengeState precedent. */
export class InvalidMatchResultState extends DomainError {
  constructor(currentStatus, attemptedAction) {
    super(
      'invalid_match_result_state',
      `Cannot ${attemptedAction} a match result in status ${currentStatus}.`,
    );
    this.currentStatus = currentStatus;
    this.attemptedAction = attemptedAction;
  }
}
