import { DomainError } from '../../domain/errors/DomainError.js';

export class CourtNotFound extends DomainError {
  constructor() {
    super('court_not_found', 'Court not found.');
  }
}
