import { DomainError } from '../../domain/errors/DomainError.js';

export class InvalidMfaToken extends DomainError {
  constructor() {
    super(
      'invalid_mfa_token',
      'El paso de verificación venció. Vuelve a entrar con tu correo y contraseña.',
    );
  }
}
