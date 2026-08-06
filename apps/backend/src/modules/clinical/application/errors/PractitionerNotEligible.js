import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown when the target user doesn't hold PSICOLOGO or NEUROPSICOLOGO. */
export class PractitionerNotEligible extends DomainError {
  constructor() {
    super(
      'practitioner_not_eligible',
      'This user does not hold a clinical practitioner role (Psicologo or Neuropsicologo).',
    );
  }
}
