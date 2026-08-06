import { DomainError } from '../../domain/errors/DomainError.js';

export class TournamentNotFound extends DomainError {
  constructor() {
    super('tournament_not_found', 'No tournament exists with that id.');
  }
}
