import { DomainError } from '../../domain/errors/DomainError.js';

export class AffiliationRequestNotFound extends DomainError {
  constructor() {
    super('affiliation_request_not_found', 'Affiliation request not found.');
  }
}
