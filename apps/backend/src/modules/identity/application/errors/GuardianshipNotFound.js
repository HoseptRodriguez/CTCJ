import { DomainError } from '../../domain/errors/DomainError.js';

export class GuardianshipNotFound extends DomainError {
  constructor() {
    super('guardianship_not_found', 'Guardianship request not found.');
  }
}
