import { DomainError } from './DomainError.js';

/** Thrown by recordPayment when the reservation already has a payment recorded. */
export class ReservationAlreadyPaid extends DomainError {
  constructor() {
    super('reservation_already_paid', 'This reservation has already been paid.');
  }
}
