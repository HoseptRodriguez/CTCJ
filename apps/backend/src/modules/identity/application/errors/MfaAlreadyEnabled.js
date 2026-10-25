import { DomainError } from '../../domain/errors/DomainError.js';

export class MfaAlreadyEnabled extends DomainError {
  constructor() {
    super('mfa_already_enabled', 'La verificación en dos pasos ya está activada.');
  }
}
