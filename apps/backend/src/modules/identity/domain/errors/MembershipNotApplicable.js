import { DomainError } from './DomainError.js';

/**
 * Thrown when setting a membership status on a user who doesn't hold
 * ROLE_CODES.JUGADOR. Membership status only ever applies to academy
 * players -- see User.setMembershipStatus().
 */
export class MembershipNotApplicable extends DomainError {
  constructor() {
    super(
      'membership_not_applicable',
      'Membership status only applies to users with the JUGADOR role.',
    );
  }
}
