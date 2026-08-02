import { describe, expect, it } from 'vitest';

import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';
import { InvalidReservationState } from '../../../../src/modules/booking/domain/errors/InvalidReservationState.js';
import { ReservationHasNoPrice } from '../../../../src/modules/booking/domain/errors/ReservationHasNoPrice.js';
import { ReservationAlreadyPaid } from '../../../../src/modules/booking/domain/errors/ReservationAlreadyPaid.js';

const NOW = new Date('2026-08-01T10:00:00Z');

function buildConfirmed({ priceCop = 60000n, paymentId = null } = {}) {
  const reservation = Reservation.createHold({
    id: 'res-1',
    clubId: 'club-1',
    courtId: 'court-1',
    periodStart: new Date(NOW.getTime() + 2 * 60 * 60_000),
    periodEnd: new Date(NOW.getTime() + 3 * 60 * 60_000),
    holderUserId: 'user-1',
    createdBy: 'user-1',
    priceCop,
    now: NOW,
  });
  reservation.confirm(new Date(NOW.getTime() + 60_000));
  reservation.paymentId = paymentId;
  return reservation;
}

describe('Regla: cobro asistido', () => {
  it('assertPayable() allows a CONFIRMED, priced, unpaid reservation', () => {
    const reservation = buildConfirmed();
    expect(() => reservation.assertPayable()).not.toThrow();
  });

  it('assertPayable() rejects a HOLD (not yet CONFIRMED)', () => {
    const reservation = Reservation.createHold({
      id: 'res-2',
      clubId: 'club-1',
      courtId: 'court-1',
      periodStart: new Date(NOW.getTime() + 2 * 60 * 60_000),
      periodEnd: new Date(NOW.getTime() + 3 * 60 * 60_000),
      holderUserId: 'user-1',
      createdBy: 'user-1',
      priceCop: 60000n,
      now: NOW,
    });
    expect(() => reservation.assertPayable()).toThrow(InvalidReservationState);
  });

  it('assertPayable() rejects a reservation with no price set', () => {
    const reservation = buildConfirmed({ priceCop: null });
    expect(() => reservation.assertPayable()).toThrow(ReservationHasNoPrice);
  });

  it('assertPayable() rejects a reservation that already has a payment', () => {
    const reservation = buildConfirmed({ paymentId: 'payment-1' });
    expect(() => reservation.assertPayable()).toThrow(ReservationAlreadyPaid);
  });
});
