import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by addParticipant when a member doesn't hold JUGADOR. */
export class PlayerNotEligible extends DomainError {
  constructor() {
    super('player_not_eligible', 'Every tournament participant must hold the Jugador role.');
  }
}
