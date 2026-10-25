import { DomainError } from '../../domain/errors/DomainError.js';

export class RoleNotAssigned extends DomainError {
  constructor() {
    super('role_not_assigned', 'La persona no tiene ese rol.');
  }
}
