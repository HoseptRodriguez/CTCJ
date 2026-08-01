import { DomainError } from '../../domain/errors/DomainError.js';

export class InvalidVerificationToken extends DomainError {
  constructor() {
    super('invalid_verification_token', 'El enlace de verificacion no es valido o ya expiro.');
  }
}
