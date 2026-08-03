import { describe, expect, it } from 'vitest';

import { projectForViewer } from '../../../../src/modules/booking/domain/services/reservationPrivacy.js';
import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';

const PERIOD_START = new Date('2026-08-10T15:00:00Z');
const PERIOD_END = new Date(PERIOD_START.getTime() + 60 * 60_000);

function buildReservation({
  reservationType = 'PRIVATE',
  holderUserId = 'user-1',
  createdBy = holderUserId,
} = {}) {
  return new Reservation({
    id: 'res-1',
    clubId: 'club-1',
    courtId: 'court-1',
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    status: 'CONFIRMED',
    reservationType,
    holderUserId,
    createdBy,
    notes: 'private notes',
  });
}

const ANONYMOUS = { userId: null, isStaff: false };
const OTHER_PLAYER = { userId: 'user-2', isStaff: false };
const OWNER = { userId: 'user-1', isStaff: false };
const STAFF = { userId: 'staff-1', isStaff: true };

describe('Regla 2: privacidad de reserva por tipo de visitante', () => {
  it('a PRIVATE reservation shows only "Ocupada" to an anonymous visitor -- no holder identity', () => {
    const reservation = buildReservation({ reservationType: 'PRIVATE' });
    const result = projectForViewer(reservation, ANONYMOUS);
    expect(result).toEqual({
      courtId: 'court-1',
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      label: 'Ocupada',
      occupied: true,
    });
    expect(result.holderUserId).toBeUndefined();
    expect(result.notes).toBeUndefined();
  });

  it('a PRIVATE reservation shows only "Ocupada" to a different, non-staff player', () => {
    const reservation = buildReservation({ reservationType: 'PRIVATE' });
    const result = projectForViewer(reservation, OTHER_PLAYER);
    expect(result.label).toBe('Ocupada');
    expect(result.holderUserId).toBeUndefined();
  });

  it('a CLASS reservation shows its real label to an anonymous visitor -- not personal data', () => {
    const reservation = buildReservation({ reservationType: 'CLASS' });
    const result = projectForViewer(reservation, ANONYMOUS);
    expect(result.label).toBe('Clase');
    expect(result.holderUserId).toBeUndefined();
  });

  it('a TOURNAMENT reservation shows its real label to a different player', () => {
    const reservation = buildReservation({ reservationType: 'TOURNAMENT' });
    const result = projectForViewer(reservation, OTHER_PLAYER);
    expect(result.label).toBe('Torneo');
  });

  it('the owner sees full detail on their own PRIVATE reservation, marked isOwnBooking', () => {
    const reservation = buildReservation({ reservationType: 'PRIVATE' });
    const result = projectForViewer(reservation, OWNER);
    expect(result.holderUserId).toBe('user-1');
    expect(result.notes).toBe('private notes');
    expect(result.status).toBe('CONFIRMED');
    expect(result.isOwnBooking).toBe(true);
  });

  it("staff sees full detail regardless of reservation type or holder, but isOwnBooking stays false for a stranger's reservation", () => {
    const reservation = buildReservation({ reservationType: 'PRIVATE' });
    const result = projectForViewer(reservation, STAFF);
    expect(result.holderUserId).toBe('user-1');
    expect(result.notes).toBe('private notes');
    expect(result.isOwnBooking).toBe(false);
  });

  it('(Phase 5) staff receives holderMembershipStatus when supplied', () => {
    const reservation = buildReservation({ reservationType: 'PRIVATE' });
    const result = projectForViewer(reservation, STAFF, 'OVERDUE');
    expect(result.holderMembershipStatus).toBe('OVERDUE');
  });

  it('(Phase 5) the owner never receives holderMembershipStatus, even if supplied -- key is entirely absent, not null', () => {
    const reservation = buildReservation({ reservationType: 'PRIVATE' });
    const result = projectForViewer(reservation, OWNER, 'OVERDUE');
    expect('holderMembershipStatus' in result).toBe(false);
  });

  it('(Phase 5) anonymous/institutional projections never carry holderMembershipStatus, even if supplied', () => {
    const reservation = buildReservation({ reservationType: 'CLASS' });
    const result = projectForViewer(reservation, ANONYMOUS, 'OVERDUE');
    expect('holderMembershipStatus' in result).toBe(false);
  });

  it('(Phase 6) the original creator sees full detail even when they are not the holder', () => {
    const reservation = buildReservation({
      reservationType: 'PRIVATE',
      holderUserId: 'minor-1',
      createdBy: 'guardian-1',
    });
    const result = projectForViewer(reservation, { userId: 'guardian-1', isStaff: false });
    expect(result.holderUserId).toBe('minor-1');
    expect(result.notes).toBe('private notes');
    expect(result.label).toBeUndefined(); // full projection, not the anonymized shape
    expect(result.isOwnBooking).toBe(true);
  });

  it('(Phase 6) an unrelated non-staff viewer still gets the anonymized shape', () => {
    const reservation = buildReservation({
      reservationType: 'PRIVATE',
      holderUserId: 'minor-1',
      createdBy: 'guardian-1',
    });
    const result = projectForViewer(reservation, { userId: 'someone-else', isStaff: false });
    expect(result.label).toBe('Ocupada');
    expect(result.holderUserId).toBeUndefined();
  });
});
