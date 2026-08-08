import { DomainError } from '../../domain/errors/DomainError.js';

/** Also thrown when a challenge exists but the caller is neither its
 * challenger nor its opponent -- a challenge only ever exists from its own
 * participants' point of view, matching goals'/notifications' identical
 * *NotFound precedent (no separate "forbidden" error for a row that isn't
 * yours). */
export class ChallengeNotFound extends DomainError {
  constructor() {
    super('challenge_not_found', 'No challenge exists with that id.');
  }
}
