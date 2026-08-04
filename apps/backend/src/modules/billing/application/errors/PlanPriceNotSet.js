import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by generateInvoice when the plan has no vigente price -- never
 * silently generate a $0 invoice for a plan that simply hasn't been priced yet. */
export class PlanPriceNotSet extends DomainError {
  constructor() {
    super(
      'plan_price_not_set',
      "This plan has no current price set -- an invoice can't be generated.",
    );
  }
}
