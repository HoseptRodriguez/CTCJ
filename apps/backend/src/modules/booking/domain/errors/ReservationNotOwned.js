import { DomainError } from './DomainError.js';

/** Thrown when a caller who is neither the reservation's holder nor staff attempts to act on it. */
export class ReservationNotOwned extends DomainError {
  constructor() {
    super('reservation_not_owned', 'You do not have permission to act on this reservation.');
  }
}
