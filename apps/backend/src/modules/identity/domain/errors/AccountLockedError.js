import { DomainError } from './DomainError.js';

/**
 * Thrown when login is attempted against a currently-locked account.
 * The HTTP layer renders this identically to InvalidCredentials -- see that
 * file's comment for why.
 */
export class AccountLockedError extends DomainError {
  constructor(lockedUntil) {
    super('invalid_credentials', 'Correo o contrasena incorrectos.');
    this.lockedUntil = lockedUntil;
  }
}
