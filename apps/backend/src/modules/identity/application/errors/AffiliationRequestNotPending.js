import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown when trying to decide an affiliation request that's already been decided. */
export class AffiliationRequestNotPending extends DomainError {
  constructor() {
    super('affiliation_request_not_pending', 'This affiliation request has already been decided.');
  }
}
