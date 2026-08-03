import { RESERVATION_TYPE } from '@ctcj/shared';

const INSTITUTIONAL_TYPES = [RESERVATION_TYPE.CLASS, RESERVATION_TYPE.TOURNAMENT];

const TYPE_LABELS = {
  [RESERVATION_TYPE.CLASS]: 'Clase',
  [RESERVATION_TYPE.TOURNAMENT]: 'Torneo',
};

/**
 * "Regla 2": only Administrator, Reception, or the reservation's own holder
 * can see who reserved a court -- everyone else sees only that the slot is
 * occupied. CLASS/TOURNAMENT reservations show their real label to anyone
 * since that's institutional information, not personal data.
 *
 * Expects `reservation` to already be in an occupying status (HOLD or
 * CONFIRMED) -- callers filter for that at the repository query level.
 *
 * @param {{ userId: string|null, isStaff: boolean }} viewer
 * @param {string|null} holderMembershipStatus -- staff-only field (Phase 5).
 *   The owner sees their own status via GET /api/identity/me/membership-status
 *   instead, never through this projection -- stays pure/no-I/O, so the
 *   caller (getSchedule.js) supplies it.
 */
export function projectForViewer(reservation, viewer, holderMembershipStatus = null) {
  // A guardian who created a hold for a linked minor (Phase 6) is also
  // "owner" here -- otherwise their own booking would render back to them as
  // an anonymized stranger's slot, with no other place in the app to find it
  // again. Mirrors Reservation.ensureOwnedBy()'s identical creator-or-holder rule.
  const isOwner =
    viewer.userId != null &&
    (reservation.holderUserId === viewer.userId || reservation.createdBy === viewer.userId);

  if (viewer.isStaff || isOwner) {
    return {
      id: reservation.id,
      courtId: reservation.courtId,
      periodStart: reservation.periodStart,
      periodEnd: reservation.periodEnd,
      status: reservation.status,
      reservationType: reservation.reservationType,
      holderUserId: reservation.holderUserId,
      notes: reservation.notes,
      priceCop: reservation.priceCop,
      paymentId: reservation.paymentId,
      // The raw owner check, not "isStaff || isOwner" -- staff viewing a
      // stranger's reservation must NOT read as "mine" client-side (e.g. the
      // booking grid's highlight color), only the true holder/creator should.
      isOwnBooking: isOwner,
      // Staff-only key -- omitted entirely (not even `null`) for the owner's
      // own view, so the frontend contract stays unambiguous: presence of
      // this key means "you're staff", not "this player has no status".
      ...(viewer.isStaff ? { holderMembershipStatus } : {}),
    };
  }

  if (INSTITUTIONAL_TYPES.includes(reservation.reservationType)) {
    return {
      courtId: reservation.courtId,
      periodStart: reservation.periodStart,
      periodEnd: reservation.periodEnd,
      label: TYPE_LABELS[reservation.reservationType],
      occupied: true,
    };
  }

  return {
    courtId: reservation.courtId,
    periodStart: reservation.periodStart,
    periodEnd: reservation.periodEnd,
    label: 'Ocupada',
    occupied: true,
  };
}
