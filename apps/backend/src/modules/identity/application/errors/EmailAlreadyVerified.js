import { DomainError } from '../../domain/errors/DomainError.js';

export class EmailAlreadyVerified extends DomainError {
  constructor() {
    super('email_already_verified', 'Esta persona ya confirmó su correo.');
  }
}
