import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown when the target user doesn't hold JUGADOR. */
export class PlayerNotEligible extends DomainError {
  constructor() {
    super('player_not_eligible', 'This user does not hold the Jugador role.');
  }
}
