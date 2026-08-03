import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by enrollPlayer when the target user doesn't hold JUGADOR. */
export class PlayerNotEligible extends DomainError {
  constructor() {
    super(
      'player_not_eligible',
      'This user does not hold the JUGADOR role and cannot be enrolled.',
    );
  }
}
