import { DomainError } from '../../domain/errors/DomainError.js';

/** Too many wrong codes in a row: wait a few minutes. */
export class MfaLocked extends DomainError {
  constructor(lockedUntil) {
    super(
      'mfa_locked',
      'Hiciste demasiados intentos con códigos equivocados. Espera 15 minutos e intenta de nuevo.',
    );
    this.lockedUntil = lockedUntil;
  }
}
