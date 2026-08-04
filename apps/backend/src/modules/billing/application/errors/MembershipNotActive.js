import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by generateInvoice when the target membership isn't ACTIVE -- a
 * suspended or ended enrollment shouldn't accrue new charges. */
export class MembershipNotActive extends DomainError {
  constructor() {
    super('membership_not_active', 'This membership is not active and cannot be invoiced.');
  }
}
