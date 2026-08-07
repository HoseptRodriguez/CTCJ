import { beforeEach, describe, expect, it } from 'vitest';

import { createGetMonthlyRevenue } from '../../../../src/modules/booking/application/useCases/getMonthlyRevenue.js';
import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';

import { createFakeClock, createFakePaymentRepository } from './fakes.js';

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

async function seedPayment(
  paymentRepository,
  byId,
  { id, reservationId, amountCop, priceCop, now },
) {
  buildConfirmed(byId, reservationId, priceCop);
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

describe('getMonthlyRevenue', () => {
  let byId;
  let paymentRepository;

  beforeEach(() => {
    byId = new Map();
    paymentRepository = createFakePaymentRepository(byId);
  });

  it('buckets payments by club-local month, oldest first, ending at the current club-local month', async () => {
    // "now" = 2026-03-15T12:00:00Z, well inside club-local March (UTC-5).
    const clock = createFakeClock(new Date('2026-03-15T12:00:00Z'));
    const getMonthlyRevenue = createGetMonthlyRevenue({ paymentRepository, clock });

    await seedPayment(paymentRepository, byId, {
      id: 'pay-jan',
      reservationId: 'res-jan',
      amountCop: 10000n,
      priceCop: 10000n,
      now: new Date('2026-01-15T12:00:00Z'),
    });
    await seedPayment(paymentRepository, byId, {
      id: 'pay-feb',
      reservationId: 'res-feb',
      amountCop: 20000n,
      priceCop: 20000n,
      now: new Date('2026-02-15T12:00:00Z'),
    });
    await seedPayment(paymentRepository, byId, {
      id: 'pay-mar',
      reservationId: 'res-mar',
      amountCop: 30000n,
      priceCop: 30000n,
      now: new Date('2026-03-15T12:00:00Z'),
    });

    const result = await getMonthlyRevenue({ months: 3 });

    expect(result.months).toEqual([
      { month: '2026-01', totalCop: 10000n, count: 1 },
      { month: '2026-02', totalCop: 20000n, count: 1 },
      { month: '2026-03', totalCop: 30000n, count: 1 },
    ]);
  });

  it('a payment right at a club-local month boundary lands in the correct month', async () => {
    // Club-local midnight on 2026-03-01 is 2026-03-01T05:00:00Z. One
    // millisecond before that instant is still club-local February.
    const clock = createFakeClock(new Date('2026-03-15T12:00:00Z'));
    const getMonthlyRevenue = createGetMonthlyRevenue({ paymentRepository, clock });

    await seedPayment(paymentRepository, byId, {
      id: 'pay-late-feb',
      reservationId: 'res-late-feb',
      amountCop: 5000n,
      priceCop: 5000n,
      now: new Date('2026-03-01T04:59:59.999Z'),
    });
    await seedPayment(paymentRepository, byId, {
      id: 'pay-early-mar',
      reservationId: 'res-early-mar',
      amountCop: 7000n,
      priceCop: 7000n,
      now: new Date('2026-03-01T05:00:00.000Z'),
    });

    const result = await getMonthlyRevenue({ months: 2 });

    expect(result.months).toEqual([
      { month: '2026-02', totalCop: 5000n, count: 1 },
      { month: '2026-03', totalCop: 7000n, count: 1 },
    ]);
  });

  it('returns zeroed months when there are no payments', async () => {
    const clock = createFakeClock(new Date('2026-03-15T12:00:00Z'));
    const getMonthlyRevenue = createGetMonthlyRevenue({ paymentRepository, clock });

    const result = await getMonthlyRevenue({ months: 2 });

    expect(result.months).toEqual([
      { month: '2026-02', totalCop: 0n, count: 0 },
      { month: '2026-03', totalCop: 0n, count: 0 },
    ]);
  });

  it('handles a year boundary correctly', async () => {
    const clock = createFakeClock(new Date('2026-01-15T12:00:00Z'));
    const getMonthlyRevenue = createGetMonthlyRevenue({ paymentRepository, clock });

    await seedPayment(paymentRepository, byId, {
      id: 'pay-dec',
      reservationId: 'res-dec',
      amountCop: 15000n,
      priceCop: 15000n,
      now: new Date('2025-12-15T12:00:00Z'),
    });

    const result = await getMonthlyRevenue({ months: 2 });

    expect(result.months).toEqual([
      { month: '2025-12', totalCop: 15000n, count: 1 },
      { month: '2026-01', totalCop: 0n, count: 0 },
    ]);
  });
});
