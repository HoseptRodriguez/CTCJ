import { DomainError } from '../../domain/errors/DomainError.js';

/** Not one of the optional authorizations a person manages by themselves. */
export class UnknownAuthorization extends DomainError {
  constructor() {
    super('unknown_authorization', 'Esa autorización no existe.');
  }
}
