import { DomainError } from '../../domain/errors/DomainError.js';

export class MatchNotFound extends DomainError {
  constructor() {
    super('match_not_found', 'No competition match exists with that id.');
  }
}
