import { DomainError } from '../../domain/errors/DomainError.js';

/** Only the guardian of an approved guardianship can authorize (or withdraw) for the minor. */
export class GuardianshipNotApproved extends DomainError {
  constructor() {
    super('guardianship_not_approved', 'La vinculación con el menor no está aprobada.');
  }
}
