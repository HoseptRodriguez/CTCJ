import { DomainError } from '../../domain/errors/DomainError.js';

export class EmailAlreadyRegistered extends DomainError {
  constructor() {
    super('email_already_registered', 'Ese correo ya esta registrado.');
  }
}
