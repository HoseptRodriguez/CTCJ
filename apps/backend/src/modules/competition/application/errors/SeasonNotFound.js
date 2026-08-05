import { DomainError } from '../../domain/errors/DomainError.js';

export class SeasonNotFound extends DomainError {
  constructor() {
    super('season_not_found', 'No competition season exists with that id.');
  }
}
