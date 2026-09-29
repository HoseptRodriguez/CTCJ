import { DomainError } from '../../domain/errors/DomainError.js';

export class MfaSetupRequired extends DomainError {
  constructor() {
    super('mfa_setup_required', 'Debes activar la verificación en dos pasos para entrar.');
  }
}
