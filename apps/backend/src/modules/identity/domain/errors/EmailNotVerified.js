import { DomainError } from './DomainError.js';

/** Thrown when an operation requires a verified email and the account isn't. */
export class EmailNotVerified extends DomainError {
  constructor() {
    super('email_not_verified', 'Debes verificar tu correo antes de continuar.');
  }
}
