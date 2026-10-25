import { DomainError } from './DomainError.js';

/** Defense in depth under the zod schema's own check: a price is whole pesos above 0. */
export class PriceNotPositive extends DomainError {
  constructor() {
    super('price_not_positive', 'A price must be greater than 0.');
  }
}
