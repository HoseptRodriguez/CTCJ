import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by recordMatchResult when the match already has a winner.
 * Correcting/voiding a recorded tournament match is explicitly out of
 * scope this phase (see the Phase 13 plan) -- staff must be careful. */
export class MatchAlreadyRecorded extends DomainError {
  constructor() {
    super('match_already_recorded', 'This match already has a recorded result.');
  }
}
