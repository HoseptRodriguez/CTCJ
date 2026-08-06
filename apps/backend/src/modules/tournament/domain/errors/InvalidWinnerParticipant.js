import { DomainError } from './DomainError.js';

/** Thrown when a match result's winner doesn't correspond to one of the
 * match's two participants, or doesn't match the side with more sets won. */
export class InvalidWinnerParticipant extends DomainError {
  constructor(winnerSide) {
    super(
      'invalid_winner_participant',
      `winnerSide must be 'A' or 'B' and must match the side with more sets won (got ${winnerSide}).`,
    );
    this.winnerSide = winnerSide;
  }
}
