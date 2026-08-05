import { DomainError } from './DomainError.js';

/** Thrown by CompetitionMatch.record() when winnerSide isn't 'A'/'B', or
 * doesn't correspond to the side with more sets won. */
export class InvalidWinnerSide extends DomainError {
  constructor(winnerSide) {
    super(
      'invalid_winner_side',
      `winnerSide must be 'A' or 'B' and must match the side with more sets won (got ${winnerSide}).`,
    );
    this.winnerSide = winnerSide;
  }
}
