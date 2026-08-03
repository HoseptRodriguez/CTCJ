import { DomainError } from './DomainError.js';

/** Defense in depth under the zod schema's own non-negative check. */
export class NegativePrice extends DomainError {
  constructor() {
    super('negative_price', 'A plan price cannot be negative.');
  }
}
