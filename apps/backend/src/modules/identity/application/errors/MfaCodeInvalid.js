import { DomainError } from '../../domain/errors/DomainError.js';

export class MfaCodeInvalid extends DomainError {
  constructor() {
    super(
      'mfa_code_invalid',
      'El código no es correcto. Revisa que sea el que muestra ahora la aplicación.',
    );
  }
}
