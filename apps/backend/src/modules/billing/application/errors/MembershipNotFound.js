import { DomainError } from '../../domain/errors/DomainError.js';

export class MembershipNotFound extends DomainError {
  constructor() {
    super('membership_not_found', 'Player membership not found.');
  }
}
