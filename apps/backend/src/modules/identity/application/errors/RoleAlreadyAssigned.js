import { DomainError } from '../../domain/errors/DomainError.js';

export class RoleAlreadyAssigned extends DomainError {
  constructor() {
    super('role_already_assigned', 'La persona ya tiene ese rol.');
  }
}
