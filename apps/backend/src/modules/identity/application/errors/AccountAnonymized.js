import { DomainError } from '../../domain/errors/DomainError.js';

export class AccountAnonymized extends DomainError {
  constructor() {
    super('account_anonymized', 'Esta cuenta fue eliminada y no se puede reactivar.');
  }
}
