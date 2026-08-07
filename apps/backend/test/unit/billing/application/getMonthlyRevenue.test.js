import { beforeEach, describe, expect, it } from 'vitest';

import { createGetMonthlyRevenue } from '../../../../src/modules/billing/application/useCases/getMonthlyRevenue.js';

import { createFakeInvoiceRepository, createFakeClock } from './fakes.js';

async function seedPaidInvoice(invoiceRepository, { amountCop, paidAt }) {
  const invoice = await invoiceRepository.create(
    {
      membershipId: 'membership-1',
      amountCop,
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-02-01'),
      dueDate: new Date('2026-01-15'),
      issuedAt: new Date('2026-01-01'),
      generatedBy: 'admin-1',
      playerId: 'player-1',
    },
    [{ description: 'Iniciación', amountCop }],
  );
  invoice.status = 'PAID';
  invoice.paidAt = paidAt;
  invoice.paidAmountCop = amountCop;
  await invoiceRepository.update(invoice);
  return invoice;
}

describe('getMonthlyRevenue (billing)', () => {
  let invoiceRepository;

  beforeEach(() => {
    invoiceRepository = createFakeInvoiceRepository();
  });

  it('buckets PAID invoices by club-local paidAt month, oldest first', async () => {
    const clock = createFakeClock(new Date('2026-03-15T12:00:00.000Z'));
    const getMonthlyRevenue = createGetMonthlyRevenue({ invoiceRepository, clock });

    await seedPaidInvoice(invoiceRepository, {
      amountCop: 100000n,
      paidAt: new Date('2026-01-15T12:00:00.000Z'),
    });
    await seedPaidInvoice(invoiceRepository, {
      amountCop: 150000n,
      paidAt: new Date('2026-03-10T12:00:00.000Z'),
    });

    const result = await getMonthlyRevenue({ months: 3 });

    expect(result.months).toEqual([
      { month: '2026-01', totalCop: 100000n, count: 1 },
      { month: '2026-02', totalCop: 0n, count: 0 },
      { month: '2026-03', totalCop: 150000n, count: 1 },
    ]);
  });

  it('never counts a PENDING or CANCELLED invoice as revenue', async () => {
    const clock = createFakeClock(new Date('2026-03-15T12:00:00.000Z'));
    const getMonthlyRevenue = createGetMonthlyRevenue({ invoiceRepository, clock });

    // Seed a PENDING invoice (never marked PAID -- paidAt stays null, so it
    // can never match a paidFrom/paidTo filter regardless of amount).
    await invoiceRepository.create(
      {
        membershipId: 'membership-1',
        amountCop: 999999n,
        periodStart: new Date('2026-03-01'),
        periodEnd: new Date('2026-04-01'),
        dueDate: new Date('2026-03-15'),
        issuedAt: new Date('2026-03-01'),
        generatedBy: 'admin-1',
        playerId: 'player-1',
      },
      [{ description: 'Iniciación', amountCop: 999999n }],
    );

    const result = await getMonthlyRevenue({ months: 1 });

    expect(result.months).toEqual([{ month: '2026-03', totalCop: 0n, count: 0 }]);
  });

  it('handles a year boundary correctly', async () => {
    const clock = createFakeClock(new Date('2026-01-15T12:00:00.000Z'));
    const getMonthlyRevenue = createGetMonthlyRevenue({ invoiceRepository, clock });

    await seedPaidInvoice(invoiceRepository, {
      amountCop: 80000n,
      paidAt: new Date('2025-12-20T12:00:00.000Z'),
    });

    const result = await getMonthlyRevenue({ months: 2 });

    expect(result.months).toEqual([
      { month: '2025-12', totalCop: 80000n, count: 1 },
      { month: '2026-01', totalCop: 0n, count: 0 },
    ]);
  });
});
