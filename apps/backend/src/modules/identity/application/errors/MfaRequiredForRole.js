import { DomainError } from '../../domain/errors/DomainError.js';

export class MfaRequiredForRole extends DomainError {
  constructor() {
    super(
      'mfa_required_for_role',
      'Por tu rol en el club, la verificación en dos pasos es obligatoria y no se puede desactivar.',
    );
  }
}
