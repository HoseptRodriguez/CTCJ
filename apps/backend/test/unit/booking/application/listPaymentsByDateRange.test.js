import { beforeEach, describe, expect, it } from 'vitest';

import { createListPaymentsByDateRange } from '../../../../src/modules/booking/application/useCases/listPaymentsByDateRange.js';
import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';

import { createFakePaymentRepository } from './fakes.js';

function buildConfirmed(byId, id, priceCop) {
  const reservation = Reservation.createHold({
    id,
    clubId: 'club-1',
    courtId: 'court-1',
    periodStart: new Date('2026-03-10T14:00:00Z'),
    periodEnd: new Date('2026-03-10T15:00:00Z'),
    holderUserId: 'user-1',
    createdBy: 'user-1',
    priceCop,
    now: new Date('2026-03-10T10:00:00Z'),
  });
  reservation.confirm(new Date('2026-03-10T10:01:00Z'));
  byId.set(reservation.id, reservation);
  return reservation;
}

async function seedPayment(paymentRepository, { id, reservationId, amountCop, now }) {
  return paymentRepository.record({
    id,
    clubId: 'club-1',
    reservationId,
    amountCop,
    method: 'CASH',
    recordedBy: 'staff-1',
    notes: null,
    now,
  });
}

describe('listPaymentsByDateRange', () => {
  let byId;
  let paymentRepository;
  let listPaymentsByDateRange;

  beforeEach(() => {
    byId = new Map();
    paymentRepository = createFakePaymentRepository(byId);
    listPaymentsByDateRange = createListPaymentsByDateRange({ paymentRepository });
  });

  it('returns only payments recorded within the range, with a matching total', async () => {
    buildConfirmed(byId, 'res-1', 60000n);
    buildConfirmed(byId, 'res-2', 40000n);
    buildConfirmed(byId, 'res-3', 25000n);

    // Club-local (America/Bogota, UTC-5) day boundaries -- 2026-03-10 local
    // is 2026-03-10T05:00:00Z .. 2026-03-11T05:00:00Z.
    await seedPayment(paymentRepository, {
      id: 'pay-1',
      reservationId: 'res-1',
      amountCop: 60000n,
      now: new Date('2026-03-10T12:00:00Z'), // inside range
    });
    await seedPayment(paymentRepository, {
      id: 'pay-2',
      reservationId: 'res-2',
      amountCop: 40000n,
      now: new Date('2026-03-11T04:59:00Z'), // still inside range (before day boundary)
    });
    await seedPayment(paymentRepository, {
      id: 'pay-3',
      reservationId: 'res-3',
      amountCop: 25000n,
      now: new Date('2026-03-12T12:00:00Z'), // outside range
    });

    const result = await listPaymentsByDateRange({ from: '2026-03-10', to: '2026-03-10' });

    expect(result.payments).toHaveLength(2);
    expect(result.count).toBe(2);
    expect(result.totalCop).toBe(100000n);
  });

  it('returns zeros for an empty range', async () => {
    const result = await listPaymentsByDateRange({ from: '2026-01-01', to: '2026-01-01' });
    expect(result).toEqual({ payments: [], totalCop: 0n, count: 0 });
  });
});
