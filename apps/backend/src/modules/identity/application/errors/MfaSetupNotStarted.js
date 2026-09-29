import { DomainError } from '../../domain/errors/DomainError.js';

export class MfaSetupNotStarted extends DomainError {
  constructor() {
    super('mfa_setup_not_started', 'Primero escanea el código QR con la aplicación.');
  }
}
