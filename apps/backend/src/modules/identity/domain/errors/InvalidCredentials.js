import { DomainError } from './DomainError.js';

/**
 * Thrown for both "no such account" and "wrong password". Deliberately
 * indistinguishable from AccountLockedError at the HTTP layer (same status,
 * same generic message) to avoid account enumeration / lockout-state leakage.
 */
export class InvalidCredentials extends DomainError {
  constructor() {
    super('invalid_credentials', 'Correo o contrasena incorrectos.');
  }
}
