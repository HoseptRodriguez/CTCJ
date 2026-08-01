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
 */
export function projectForViewer(reservation, viewer) {
  const isOwner = viewer.userId != null && reservation.holderUserId === viewer.userId;

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
