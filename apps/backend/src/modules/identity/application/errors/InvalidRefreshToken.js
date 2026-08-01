import { DomainError } from '../../domain/errors/DomainError.js';

/** Also thrown (deliberately, same shape) when reuse of a rotated-out token is detected. */
export class InvalidRefreshToken extends DomainError {
  constructor() {
    super('invalid_refresh_token', 'La sesion no es valida. Inicia sesion de nuevo.');
  }
}
