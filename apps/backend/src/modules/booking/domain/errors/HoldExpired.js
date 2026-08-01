import { DomainError } from './DomainError.js';

/**
 * Thrown by confirm() as a defense-in-depth re-check when a HOLD's expiry
 * has already passed. The primary release mechanism is the scheduled
 * expireHoldsJob, not this check -- this exists in case confirm() races the
 * job (see infrastructure/jobs/expireHoldsJob.js).
 */
export class HoldExpired extends DomainError {
  constructor() {
    super('hold_expired', 'This hold has expired. Please start a new reservation.');
  }
}
