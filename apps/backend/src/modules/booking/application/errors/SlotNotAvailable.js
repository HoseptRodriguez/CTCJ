import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown when the requested court/period conflicts with an existing HOLD or CONFIRMED reservation. */
export class SlotNotAvailable extends DomainError {
  constructor() {
    super('slot_not_available', 'That time slot is no longer available.');
  }
}
