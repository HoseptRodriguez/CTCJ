import { DomainError } from '../../domain/errors/DomainError.js';

/** The decision was made on a policy version that is no longer in force: ask again. */
export class OutdatedPolicyVersion extends DomainError {
  constructor() {
    super('outdated_policy_version', 'La política cambió. Revisa de nuevo tu decisión.');
  }
}
