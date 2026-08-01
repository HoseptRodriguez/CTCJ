import { DomainError } from '../../domain/errors/DomainError.js';

export class UserNotFound extends DomainError {
  constructor() {
    super('user_not_found', 'Usuario no encontrado.');
  }
}
