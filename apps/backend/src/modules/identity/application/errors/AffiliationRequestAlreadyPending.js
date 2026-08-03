import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown when a user already has a PENDING affiliation request. */
export class AffiliationRequestAlreadyPending extends DomainError {
  constructor() {
    super('affiliation_request_already_pending', 'You already have a pending affiliation request.');
  }
}
