import { describe, expect, it } from 'vitest';

import { findSlotReservation, reservationSlotStatus } from './reservationSlotStatus.js';

const VIEWER_ID = 'user-1';
const OTHER_ID = 'user-2';

describe('reservationSlotStatus', () => {
  it('returns available for an empty slot', () => {
    expect(reservationSlotStatus(null, VIEWER_ID)).toBe('available');
    expect(reservationSlotStatus(undefined, VIEWER_ID)).toBe('available');
  });

  describe('owner/staff-shaped payload (has reservationType)', () => {
    it("returns mine for the viewer's own PRIVATE reservation", () => {
      const reservation = { reservationType: 'PRIVATE', holderUserId: VIEWER_ID };
      expect(reservationSlotStatus(reservation, VIEWER_ID)).toBe('mine');
    });

    it("returns occupied for someone else's PRIVATE reservation, even when the viewer can see it (staff)", () => {
      const reservation = { reservationType: 'PRIVATE', holderUserId: OTHER_ID };
      expect(reservationSlotStatus(reservation, VIEWER_ID)).toBe('occupied');
    });

    it('returns occupied for a PRIVATE reservation when there is no logged-in viewer', () => {
      const reservation = { reservationType: 'PRIVATE', holderUserId: OTHER_ID };
      expect(reservationSlotStatus(reservation, null)).toBe('occupied');
    });

    it.each([
      ['CLASS', 'class'],
      ['TOURNAMENT', 'tournament'],
      ['MAINTENANCE', 'maintenance'],
      ['BLOCKED', 'blocked'],
    ])('maps reservationType %s to token %s regardless of holder', (reservationType, token) => {
      const reservation = { reservationType, holderUserId: OTHER_ID };
      expect(reservationSlotStatus(reservation, VIEWER_ID)).toBe(token);
    });
  });

  describe('anonymous/non-owner-shaped payload (only label + occupied)', () => {
    it('maps label "Clase" to class', () => {
      expect(reservationSlotStatus({ label: 'Clase', occupied: true }, VIEWER_ID)).toBe('class');
    });

    it('maps label "Torneo" to tournament', () => {
      expect(reservationSlotStatus({ label: 'Torneo', occupied: true }, VIEWER_ID)).toBe(
        'tournament',
      );
    });

    it('maps label "Ocupada" (a private booking that is not the viewer\'s) to occupied', () => {
      expect(reservationSlotStatus({ label: 'Ocupada', occupied: true }, VIEWER_ID)).toBe(
        'occupied',
      );
    });

    it('never reveals "mine" from this shape, even if it happens to be the viewer\'s own booking seen anonymously', () => {
      // Regression guard: the server never actually sends this shape for the
      // viewer's own reservation (it always uses the owner shape for them),
      // but the client function itself must not infer ownership from label text.
      expect(reservationSlotStatus({ label: 'Ocupada', occupied: true }, null)).toBe('occupied');
    });
  });
});

describe('findSlotReservation', () => {
  const reservations = [
    {
      courtId: 'court-a',
      periodStart: '2026-08-01T10:00:00.000Z',
      label: 'Ocupada',
      occupied: true,
    },
    { courtId: 'court-b', periodStart: '2026-08-01T11:00:00.000Z', label: 'Clase', occupied: true },
  ];

  it('finds the reservation matching court and exact start time', () => {
    const found = findSlotReservation(reservations, 'court-a', '2026-08-01T10:00:00.000Z');
    expect(found).toBe(reservations[0]);
  });

  it('returns null when no reservation matches', () => {
    expect(findSlotReservation(reservations, 'court-a', '2026-08-01T11:00:00.000Z')).toBeNull();
    expect(findSlotReservation(reservations, 'court-c', '2026-08-01T10:00:00.000Z')).toBeNull();
  });
});
