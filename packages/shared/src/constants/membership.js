/**
 * Membership/payment status -- deliberately orthogonal to ROLE_CODES (see
 * constants/roles.js). A person can hold ROLE_CODES.JUGADOR while their
 * MEMBERSHIP_STATUS is OVERDUE; neither fact implies or changes the other.
 */
export const MEMBERSHIP_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  OVERDUE: 'OVERDUE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
});

/**
 * The only statuses the booking-block policy (see booking's createHold.js)
 * ever consults. Named for this one specific consequence -- never treat this
 * as a generic "is this account restricted" flag. Per docs/adr and the real
 * club requirements docs, overdue payment must never restrict sporting or
 * clinical data access, only new court bookings, and only when the club has
 * explicitly opted in via the admin-configurable policy toggle.
 */
export const BOOKING_BLOCKED_MEMBERSHIP_STATUSES = Object.freeze([
  MEMBERSHIP_STATUS.OVERDUE,
  MEMBERSHIP_STATUS.INACTIVE,
  MEMBERSHIP_STATUS.SUSPENDED,
]);
