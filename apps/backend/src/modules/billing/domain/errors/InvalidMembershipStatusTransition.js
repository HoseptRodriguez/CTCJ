import { DomainError } from './DomainError.js';

/**
 * Thrown by PlayerMembership's activate()/suspend()/end() when the
 * requested transition isn't legal. ACTIVE<->SUSPENDED are freely
 * reversible; ENDED is terminal -- a returning player gets a new enrollment
 * row instead of reactivating an ended one.
 */
export class InvalidMembershipStatusTransition extends DomainError {
  constructor(fromStatus, toStatus) {
    super(
      'invalid_membership_status_transition',
      `Cannot transition a membership from ${fromStatus} to ${toStatus}.`,
    );
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}
