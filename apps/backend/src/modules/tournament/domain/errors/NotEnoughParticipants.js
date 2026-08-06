import { DomainError } from './DomainError.js';

/** Thrown by generateDraw() when a tournament has fewer than 2 participants. */
export class NotEnoughParticipants extends DomainError {
  constructor(count) {
    super(
      'not_enough_participants',
      `A tournament needs at least 2 participants to generate a draw (has ${count}).`,
    );
    this.count = count;
  }
}
