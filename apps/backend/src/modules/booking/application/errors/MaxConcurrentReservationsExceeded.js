import { DomainError } from '../../domain/errors/DomainError.js';
import { MAX_CONCURRENT_PER_PLAYER } from '../../domain/policies/bookingPolicy.js';

/** Thrown when a player already holds MAX_CONCURRENT_PER_PLAYER active (HOLD/CONFIRMED) reservations. */
export class MaxConcurrentReservationsExceeded extends DomainError {
  constructor() {
    super(
      'max_concurrent_reservations_exceeded',
      `You can only have ${MAX_CONCURRENT_PER_PLAYER} active reservations at a time.`,
    );
  }
}
