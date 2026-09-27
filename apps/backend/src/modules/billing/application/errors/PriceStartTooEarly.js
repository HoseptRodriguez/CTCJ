import { DomainError } from '../../domain/errors/DomainError.js';

/**
 * The new price would start before the earliest allowed day: never in the
 * past, and after the notice period when the plan has active players.
 */
export class PriceStartTooEarly extends DomainError {
  /** @param {Date} earliest */
  constructor(earliest) {
    super(
      'price_start_too_early',
      `The new price can start on ${earliest.toISOString().slice(0, 10)} at the earliest.`,
    );
    this.earliestValidFrom = earliest.toISOString().slice(0, 10);
  }
}
