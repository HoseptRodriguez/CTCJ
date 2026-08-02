import { beforeEach, describe, expect, it } from 'vitest';

import { createRecordPayment } from '../../../../src/modules/booking/application/useCases/recordPayment.js';
import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';
import { ReservationNotFound } from '../../../../src/modules/booking/application/errors/ReservationNotFound.js';
import { InvalidReservationState } from '../../../../src/modules/booking/domain/errors/InvalidReservationState.js';
import { ReservationHasNoPrice } from '../../../../src/modules/booking/domain/errors/ReservationHasNoPrice.js';
import { ReservationAlreadyPaid } from '../../../../src/modules/booking/domain/errors/ReservationAlreadyPaid.js';
import { PaymentConflict } from '../../../../src/modules/booking/application/errors/PaymentConflict.js';

import {
  createFakeReservationRepository,
  createFakePaymentRepository,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-08-01T10:00:00Z');

function buildConfirmed(byId, overrides = {}) {
  const reservation = Reservation.createHold({
    id: 'res-1',
    clubId: 'club-1',
    courtId: 'court-1',
    periodStart: new Date(NOW.getTime() + 2 * 60 * 60_000),
    periodEnd: new Date(NOW.getTime() + 3 * 60 * 60_000),
    holderUserId: 'user-1',
    createdBy: 'user-1',
    priceCop: 60000n,
    now: NOW,
    ...overrides,
  });
  reservation.confirm(new Date(NOW.getTime() + 60_000));
  Object.assign(reservation, overrides);
  byId.set(reservation.id, reservation);
  return reservation;
}

function buildDeps() {
  const byId = new Map();
  return {
    byId,
    reservationRepository: createFakeReservationRepository(byId),
    paymentRepository: createFakePaymentRepository(byId),
    clock: createFakeClock(NOW),
    clubId: 'club-1',
  };
}

describe('recordPayment', () => {
  let deps;
  let recordPayment;

  beforeEach(() => {
    deps = buildDeps();
    recordPayment = createRecordPayment(deps);
  });

  it('records a payment for a CONFIRMED, priced, unpaid reservation', async () => {
    buildConfirmed(deps.byId);

    const result = await recordPayment({
      reservationId: 'res-1',
      method: 'CASH',
      recordedBy: 'staff-1',
    });

    expect(result).toMatchObject({ reservationId: 'res-1', amountCop: 60000n, method: 'CASH' });
    expect(result.paymentId).toBeTruthy();
    expect(result.recordedAt).toBeInstanceOf(Date);

    const stored = await deps.reservationRepository.findById('res-1');
    expect(stored.paymentId).toBe(result.paymentId);
  });

  it('rejects an unknown reservation', async () => {
    await expect(
      recordPayment({ reservationId: 'does-not-exist', method: 'CASH', recordedBy: 'staff-1' }),
    ).rejects.toThrow(ReservationNotFound);
  });

  it('rejects a HOLD reservation (not yet confirmed)', async () => {
    const held = Reservation.createHold({
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
    deps.byId.set(held.id, held);

    await expect(
      recordPayment({ reservationId: 'res-2', method: 'CASH', recordedBy: 'staff-1' }),
    ).rejects.toThrow(InvalidReservationState);
  });

  it('rejects a reservation with no price set', async () => {
    buildConfirmed(deps.byId, { priceCop: null });

    await expect(
      recordPayment({ reservationId: 'res-1', method: 'CASH', recordedBy: 'staff-1' }),
    ).rejects.toThrow(ReservationHasNoPrice);
  });

  it('rejects a reservation that already has a payment', async () => {
    buildConfirmed(deps.byId, { paymentId: 'existing-payment' });

    await expect(
      recordPayment({ reservationId: 'res-1', method: 'CASH', recordedBy: 'staff-1' }),
    ).rejects.toThrow(ReservationAlreadyPaid);
  });

  it('translates a repository-level race (PaymentConflict) into ReservationAlreadyPaid', async () => {
    buildConfirmed(deps.byId);
    deps.paymentRepository.record = async () => {
      throw new PaymentConflict();
    };

    await expect(
      recordPayment({ reservationId: 'res-1', method: 'CASH', recordedBy: 'staff-1' }),
    ).rejects.toThrow(ReservationAlreadyPaid);
  });
});
