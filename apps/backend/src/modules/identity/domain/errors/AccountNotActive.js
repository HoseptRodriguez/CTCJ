import { DomainError } from './DomainError.js';

/** The account was suspended or deactivated by the club: it can't sign in. */
export class AccountNotActive extends DomainError {
  constructor() {
    super(
      'account_not_active',
      'Esta cuenta está desactivada. Si crees que es un error, comunícate con el club.',
    );
  }
}
