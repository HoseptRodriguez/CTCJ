import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by addParticipant when a player is already registered (as
 * themselves or as half of a doubles pair) in this tournament. */
export class PlayerAlreadyRegistered extends DomainError {
  constructor() {
    super(
      'player_already_registered',
      'A player cannot be registered twice in the same tournament.',
    );
  }
}
