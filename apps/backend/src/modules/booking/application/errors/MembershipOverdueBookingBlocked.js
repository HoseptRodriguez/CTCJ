import { DomainError } from '../../domain/errors/DomainError.js';

/**
 * Thrown by createHold when the club's overdue-booking policy is enabled
 * AND the holder's membership status is OVERDUE/INACTIVE/SUSPENDED. Never
 * thrown for any other reason -- this is the one, narrow, documented
 * consequence of overdue membership (see docs/adr and Phase 5 plan): it
 * never touches sporting-performance or clinical data access.
 */
export class MembershipOverdueBookingBlocked extends DomainError {
  constructor() {
    super(
      'membership_overdue_booking_blocked',
      'Your membership status does not currently allow new reservations. Contact reception to regularize your account.',
    );
  }
}
