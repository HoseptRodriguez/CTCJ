import { DomainError } from '../../domain/errors/DomainError.js';

/** The form was sent too fast, too late, or without a valid token: likely a bot. */
export class FormTokenInvalid extends DomainError {
  constructor() {
    super(
      'form_token_invalid',
      'No pudimos recibir la solicitud. Recarga la página, espera unos segundos y envíala de nuevo.',
    );
  }
}
