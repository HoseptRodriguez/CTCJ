import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by recordMatch when a participant doesn't hold JUGADOR. */
export class PlayerNotEligible extends DomainError {
  constructor() {
    super('player_not_eligible', 'Every match participant must hold the Jugador role.');
  }
}
