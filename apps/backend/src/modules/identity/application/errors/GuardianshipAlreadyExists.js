import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown when a PENDING or APPROVED guardianship already exists for this guardian+minor pair. */
export class GuardianshipAlreadyExists extends DomainError {
  constructor() {
    super('guardianship_already_exists', 'A guardianship request for this pair already exists.');
  }
}
