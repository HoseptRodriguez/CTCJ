import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown when a user who already holds JUGADOR submits a new affiliation request. */
export class AlreadyJugador extends DomainError {
  constructor() {
    super('already_jugador', 'This user already holds the JUGADOR role.');
  }
}
