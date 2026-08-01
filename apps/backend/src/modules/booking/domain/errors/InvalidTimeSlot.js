import { DomainError } from './DomainError.js';

/** Thrown when a requested slot violates bookingPolicy (duration, advance window, or is in the past). */
export class InvalidTimeSlot extends DomainError {
  constructor(reason) {
    super('invalid_time_slot', reason);
  }
}
