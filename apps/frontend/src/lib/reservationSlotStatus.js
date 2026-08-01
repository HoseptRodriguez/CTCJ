import { RESERVATION_TYPE } from '@ctcj/shared';

const TYPE_TO_TOKEN = {
  [RESERVATION_TYPE.CLASS]: 'class',
  [RESERVATION_TYPE.TOURNAMENT]: 'tournament',
  [RESERVATION_TYPE.MAINTENANCE]: 'maintenance',
  [RESERVATION_TYPE.BLOCKED]: 'blocked',
};

const LABEL_TO_TOKEN = {
  Clase: 'class',
  Torneo: 'tournament',
};

/**
 * Classifies a single reservation, already privacy-projected by the server
 * (see apps/backend's reservationPrivacy.js), into one of the 7 booking
 * status tokens the UI understands (available/occupied/mine/class/
 * tournament/maintenance/blocked). `null`/`undefined` means the slot is free.
 *
 * The server sends two different shapes depending on the viewer:
 *  - owner/staff: the full reservation, including `reservationType` and
 *    `holderUserId`.
 *  - everyone else: only `{ label, occupied }` -- `label` is `'Clase'` or
 *    `'Torneo'` for institutional bookings, `'Ocupada'` for anything else
 *    (a private booking that isn't the viewer's, or a maintenance/blocked
 *    slot -- the server intentionally doesn't reveal which to non-staff, so
 *    the client can't distinguish them either and both fall back to
 *    'occupied').
 */
export function reservationSlotStatus(reservation, viewerUserId) {
  if (!reservation) return 'available';

  if ('reservationType' in reservation) {
    const token = TYPE_TO_TOKEN[reservation.reservationType];
    if (token) return token;
    const isMine = viewerUserId != null && reservation.holderUserId === viewerUserId;
    return isMine ? 'mine' : 'occupied';
  }

  return LABEL_TO_TOKEN[reservation.label] ?? 'occupied';
}

/**
 * Finds the reservation (if any) occupying `courtId` at `slotStartIso`.
 * Slots are fixed 60-minute blocks (see SLOT_DURATION_MINUTES in the
 * backend's bookingPolicy.js), so an exact periodStart match is enough --
 * no overlap arithmetic needed.
 */
export function findSlotReservation(reservations, courtId, slotStartIso) {
  return (
    reservations.find(
      (r) => r.courtId === courtId && new Date(r.periodStart).toISOString() === slotStartIso,
    ) ?? null
  );
}
