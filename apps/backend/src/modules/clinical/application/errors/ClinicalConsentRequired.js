import { DomainError } from '../../domain/errors/DomainError.js';

/** The player has not authorized (or has withdrawn) access to this content. */
export class ClinicalConsentRequired extends DomainError {
  constructor() {
    super(
      'clinical_consent_required',
      'The player has not authorized the club administration to read their physiotherapy notes.',
    );
  }
}
