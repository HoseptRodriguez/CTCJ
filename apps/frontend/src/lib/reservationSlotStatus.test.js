import { describe, expect, it } from 'vitest';

import { findSlotReservation, reservationSlotStatus } from './reservationSlotStatus.js';

describe('reservationSlotStatus', () => {
  it('returns available for an empty slot', () => {
    expect(reservationSlotStatus(null)).toBe('available');
    expect(reservationSlotStatus(undefined)).toBe('available');
  });

  describe('owner/staff-shaped payload (has reservationType)', () => {
    it('returns mine when the server marks isOwnBooking true', () => {
      const reservation = { reservationType: 'PRIVATE', isOwnBooking: true };
      expect(reservationSlotStatus(reservation)).toBe('mine');
    });

    it('returns occupied when the server marks isOwnBooking false, even for staff viewing it', () => {
      const reservation = { reservationType: 'PRIVATE', isOwnBooking: false };
      expect(reservationSlotStatus(reservation)).toBe('occupied');
    });

    it('returns occupied when isOwnBooking is absent (defensive default)', () => {
      const reservation = { reservationType: 'PRIVATE' };
      expect(reservationSlotStatus(reservation)).toBe('occupied');
    });

    it.each([
      ['CLASS', 'class'],
      ['TOURNAMENT', 'tournament'],
      ['MAINTENANCE', 'maintenance'],
      ['BLOCKED', 'blocked'],
    ])(
      'maps reservationType %s to token %s regardless of isOwnBooking',
      (reservationType, token) => {
        const reservation = { reservationType, isOwnBooking: false };
        expect(reservationSlotStatus(reservation)).toBe(token);
      },
    );
  });

  describe('anonymous/non-owner-shaped payload (only label + occupied)', () => {
    it('maps label "Clase" to class', () => {
      expect(reservationSlotStatus({ label: 'Clase', occupied: true })).toBe('class');
    });

    it('maps label "Torneo" to tournament', () => {
      expect(reservationSlotStatus({ label: 'Torneo', occupied: true })).toBe('tournament');
    });

    it('maps label "Ocupada" (a private booking that is not the viewer\'s) to occupied', () => {
      expect(reservationSlotStatus({ label: 'Ocupada', occupied: true })).toBe('occupied');
    });

    it('never reveals "mine" from this shape, even if it happens to be the viewer\'s own booking seen anonymously', () => {
      // Regression guard: the server never actually sends this shape for the
      // viewer's own reservation (it always uses the owner shape for them),
      // but the client function itself must not infer ownership from label text.
      expect(reservationSlotStatus({ label: 'Ocupada', occupied: true })).toBe('occupied');
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
