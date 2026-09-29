import { DomainError } from '../../domain/errors/DomainError.js';

export class CannotChangeOwnAccount extends DomainError {
  constructor() {
    super('cannot_change_own_account', 'No puedes cambiar tu propia cuenta desde aquí.');
  }
}
