import { DomainError } from './DomainError.js';

/** Thrown when a new price's validFrom isn't strictly after the currently vigente price's validFrom. */
export class InvalidPriceValidFrom extends DomainError {
  constructor() {
    super(
      'invalid_price_valid_from',
      'The new price must take effect strictly after the current price started.',
    );
  }
}
