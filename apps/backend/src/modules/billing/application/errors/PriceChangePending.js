import { DomainError } from '../../domain/errors/DomainError.js';

/** The plan already has a price change waiting to start; cancel it first. */
export class PriceChangePending extends DomainError {
  /** @param {Date} validFrom */
  constructor(validFrom) {
    super(
      'price_change_pending',
      `This plan already has a price change starting on ${validFrom.toISOString().slice(0, 10)}.`,
    );
    this.pendingValidFrom = validFrom.toISOString().slice(0, 10);
  }
}
