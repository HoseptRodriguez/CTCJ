import { DomainError } from '../../domain/errors/DomainError.js';

export class MatchNotFound extends DomainError {
  constructor() {
    super('match_not_found', 'No match exists with that id in this tournament.');
  }
}
