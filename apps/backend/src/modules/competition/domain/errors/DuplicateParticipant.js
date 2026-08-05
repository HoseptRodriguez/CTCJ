import { DomainError } from './DomainError.js';

/** Thrown by CompetitionMatch.record() when the same player appears more
 * than once across both sides of a match. */
export class DuplicateParticipant extends DomainError {
  constructor() {
    super('duplicate_participant', 'A player cannot appear more than once in the same match.');
  }
}
