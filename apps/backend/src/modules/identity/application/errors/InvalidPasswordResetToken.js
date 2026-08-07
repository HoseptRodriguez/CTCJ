import { DomainError } from '../../domain/errors/DomainError.js';

export class InvalidPasswordResetToken extends DomainError {
  constructor() {
    super(
      'invalid_password_reset_token',
      'El enlace para restablecer la clave no es válido o ya expiró.',
    );
  }
}
