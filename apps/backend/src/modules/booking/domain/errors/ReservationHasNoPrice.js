import { DomainError } from './DomainError.js';

/** Thrown by recordPayment when the reservation's court has never had a price set. */
export class ReservationHasNoPrice extends DomainError {
  constructor() {
    super('reservation_has_no_price', 'This reservation has no price recorded to charge.');
  }
}
