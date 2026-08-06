import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by recordMatchResult when the match is still waiting on a feeder
 * match (one or both participant slots are still empty). */
export class MatchNotReady extends DomainError {
  constructor() {
    super('match_not_ready', 'This match is still waiting on a feeder match to resolve.');
  }
}
