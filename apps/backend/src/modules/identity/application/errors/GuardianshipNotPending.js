import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown when trying to decide a guardianship request that's already been decided. */
export class GuardianshipNotPending extends DomainError {
  constructor() {
    super('guardianship_not_pending', 'This guardianship request has already been decided.');
  }
}
