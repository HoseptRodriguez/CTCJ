import { DomainError } from '../../domain/errors/DomainError.js';

export class MfaNotEnabled extends DomainError {
  constructor() {
    super('mfa_not_enabled', 'La verificación en dos pasos no está activada.');
  }
}
