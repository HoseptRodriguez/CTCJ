import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by submitMatchScore when the challenge isn't ACCEPTED -- covers
 * both "still PENDING" and "already COMPLETED" in one check. */
export class ChallengeNotAccepted extends DomainError {
  constructor() {
    super('challenge_not_accepted', 'Scores can only be submitted for an accepted challenge.');
  }
}
