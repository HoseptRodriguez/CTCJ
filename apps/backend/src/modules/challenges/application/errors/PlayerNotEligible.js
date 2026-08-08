import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown when either side of a challenge doesn't hold JUGADOR. */
export class PlayerNotEligible extends DomainError {
  constructor() {
    super(
      'player_not_eligible',
      'Both players must hold the Jugador role to challenge each other.',
    );
  }
}
