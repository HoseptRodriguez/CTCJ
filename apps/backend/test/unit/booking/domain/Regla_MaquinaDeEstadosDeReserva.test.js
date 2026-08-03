import { describe, expect, it } from 'vitest';

import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';
import { InvalidReservationState } from '../../../../src/modules/booking/domain/errors/InvalidReservationState.js';
import { HoldExpired } from '../../../../src/modules/booking/domain/errors/HoldExpired.js';
import { ReservationNotOwned } from '../../../../src/modules/booking/domain/errors/ReservationNotOwned.js';

const NOW = new Date('2026-08-01T10:00:00Z');

function buildHold(now = NOW) {
  return Reservation.createHold({
    id: 'res-1',
    clubId: 'club-1',
    courtId: 'court-1',
    periodStart: new Date(now.getTime() + 2 * 60 * 60_000),
    periodEnd: new Date(now.getTime() + 3 * 60 * 60_000),
    holderUserId: 'user-1',
    createdBy: 'user-1',
    now,
  });
}

describe('Regla: maquina de estados de la reserva', () => {
  it('createHold() sets status HOLD, type PRIVATE, and a 5-minute expiry', () => {
    const reservation = buildHold();
    expect(reservation.status).toBe('HOLD');
    expect(reservation.reservationType).toBe('PRIVATE');
    expect(reservation.holdExpiresAt.getTime()).toBe(NOW.getTime() + 5 * 60_000);
    expect(reservation.isOccupying()).toBe(true);
  });

  it('confirm() transitions HOLD -> CONFIRMED before expiry', () => {
    const reservation = buildHold();
    const confirmAt = new Date(NOW.getTime() + 60_000);
    reservation.confirm(confirmAt);
    expect(reservation.status).toBe('CONFIRMED');
  });

  it('confirm() throws HoldExpired past the 5-minute window (defense-in-depth re-check)', () => {
    const reservation = buildHold();
    const confirmAt = new Date(NOW.getTime() + 6 * 60_000);
    expect(() => reservation.confirm(confirmAt)).toThrow(HoldExpired);
    expect(reservation.status).toBe('HOLD'); // unchanged
  });

  it('confirm() throws InvalidReservationState when not HOLD', () => {
    const reservation = buildHold();
    reservation.confirm(new Date(NOW.getTime() + 60_000));
    expect(() => reservation.confirm(new Date(NOW.getTime() + 120_000))).toThrow(
      InvalidReservationState,
    );
  });

  it('cancel() is legal from HOLD and from CONFIRMED', () => {
    const held = buildHold();
    expect(() => held.cancel(new Date(NOW.getTime() + 60_000))).not.toThrow();
    expect(held.status).toBe('CANCELLED');

    const confirmed = buildHold();
    confirmed.confirm(new Date(NOW.getTime() + 60_000));
    expect(() => confirmed.cancel(new Date(NOW.getTime() + 120_000))).not.toThrow();
    expect(confirmed.status).toBe('CANCELLED');
  });

  it('cancel() throws InvalidReservationState when already cancelled', () => {
    const reservation = buildHold();
    reservation.cancel(new Date(NOW.getTime() + 60_000));
    expect(() => reservation.cancel(new Date(NOW.getTime() + 120_000))).toThrow(
      InvalidReservationState,
    );
  });

  it('expire() is idempotent: no-op unless HOLD and past expiry', () => {
    const reservation = buildHold();
    reservation.expire(new Date(NOW.getTime() + 60_000)); // not yet expired
    expect(reservation.status).toBe('HOLD');

    reservation.expire(new Date(NOW.getTime() + 6 * 60_000)); // now expired
    expect(reservation.status).toBe('EXPIRED');

    reservation.expire(new Date(NOW.getTime() + 7 * 60_000)); // already EXPIRED, no-op
    expect(reservation.status).toBe('EXPIRED');
  });

  it('ensureOwnedBy() allows the holder, rejects everyone else, and always allows staff', () => {
    const reservation = buildHold();
    expect(() => reservation.ensureOwnedBy('user-1', false)).not.toThrow();
    expect(() => reservation.ensureOwnedBy('user-2', false)).toThrow(ReservationNotOwned);
    expect(() => reservation.ensureOwnedBy('user-2', true)).not.toThrow(); // staff bypass
  });

  it('ensureOwnedBy() also allows the original creator when different from the holder (Phase 6)', () => {
    const reservation = Reservation.createHold({
      id: 'res-2',
      clubId: 'club-1',
      courtId: 'court-1',
      periodStart: new Date(NOW.getTime() + 2 * 60 * 60_000),
      periodEnd: new Date(NOW.getTime() + 3 * 60 * 60_000),
      holderUserId: 'minor-1',
      createdBy: 'guardian-1',
      now: NOW,
    });
    expect(() => reservation.ensureOwnedBy('minor-1', false)).not.toThrow(); // holder
    expect(() => reservation.ensureOwnedBy('guardian-1', false)).not.toThrow(); // creator
    expect(() => reservation.ensureOwnedBy('someone-else', false)).toThrow(ReservationNotOwned);
  });
});
