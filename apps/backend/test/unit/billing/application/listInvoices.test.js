import { beforeEach, describe, expect, it } from 'vitest';

import { createListInvoices } from '../../../../src/modules/billing/application/useCases/listInvoices.js';

import {
  createFakeInvoiceRepository,
  createFakePlayerDirectoryProvider,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-03-15T12:00:00.000Z');

async function seedInvoice(
  invoiceRepository,
  { playerId, status = 'PENDING', dueDate, paidAt = null, amountCop = 100000n },
) {
  const invoice = await invoiceRepository.create(
    {
      membershipId: 'membership-1',
      amountCop,
      periodStart: new Date('2026-03-01'),
      periodEnd: new Date('2026-04-01'),
      dueDate,
      issuedAt: new Date('2026-03-01'),
      generatedBy: 'admin-1',
      playerId,
    },
    [{ description: 'Iniciación', amountCop }],
  );
  if (status !== 'PENDING') {
    invoice.status = status;
    invoice.paidAt = paidAt;
    invoice.paidAmountCop = status === 'PAID' ? amountCop : null;
    await invoiceRepository.update(invoice);
  }
  return invoice;
}

describe('listInvoices', () => {
  let invoiceRepository;
  let playerDirectoryProvider;
  let listInvoices;

  beforeEach(() => {
    invoiceRepository = createFakeInvoiceRepository();
    playerDirectoryProvider = createFakePlayerDirectoryProvider(
      new Map([['player-1', { firstName: 'Ana', lastName: 'Gomez', email: 'ana@example.com' }]]),
    );
    listInvoices = createListInvoices({
      invoiceRepository,
      playerDirectoryProvider,
      clock: createFakeClock(NOW),
    });
  });

  it('marks a PENDING invoice past its due date as overdue', async () => {
    await seedInvoice(invoiceRepository, { playerId: 'player-1', dueDate: new Date('2026-03-01') });

    const result = await listInvoices({ status: 'PENDING' });

    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].isOverdue).toBe(true);
  });

  it('does not mark a PENDING invoice not yet due as overdue', async () => {
    await seedInvoice(invoiceRepository, { playerId: 'player-1', dueDate: new Date('2026-04-01') });

    const result = await listInvoices({ status: 'PENDING' });

    expect(result.invoices[0].isOverdue).toBe(false);
  });

  it('never marks a PAID or CANCELLED invoice as overdue, even if past due date', async () => {
    await seedInvoice(invoiceRepository, {
      playerId: 'player-1',
      dueDate: new Date('2026-03-01'),
      status: 'PAID',
      paidAt: new Date('2026-03-02'),
    });

    const result = await listInvoices({ status: 'PAID' });

    expect(result.invoices[0].isOverdue).toBe(false);
  });

  it('enriches invoices with the player summary when resolvable', async () => {
    await seedInvoice(invoiceRepository, { playerId: 'player-1', dueDate: new Date('2026-04-01') });

    const result = await listInvoices({ status: 'PENDING' });

    expect(result.invoices[0]).toMatchObject({
      playerFirstName: 'Ana',
      playerLastName: 'Gomez',
      playerEmail: 'ana@example.com',
    });
  });

  it('does not throw when a player summary is unresolvable, leaves fields null', async () => {
    await seedInvoice(invoiceRepository, {
      playerId: 'unknown-player',
      dueDate: new Date('2026-04-01'),
    });

    const result = await listInvoices({ status: 'PENDING' });

    expect(result.invoices[0]).toMatchObject({
      playerFirstName: null,
      playerLastName: null,
      playerEmail: null,
    });
  });

  it('filters PAID invoices by paidAt date range and totals correctly', async () => {
    await seedInvoice(invoiceRepository, {
      playerId: 'player-1',
      dueDate: new Date('2026-03-01'),
      status: 'PAID',
      paidAt: new Date('2026-03-05'),
      amountCop: 50000n,
    });
    await seedInvoice(invoiceRepository, {
      playerId: 'player-1',
      dueDate: new Date('2026-04-01'),
      status: 'PAID',
      paidAt: new Date('2026-05-05'),
      amountCop: 70000n,
    });

    const result = await listInvoices({
      status: 'PAID',
      paidFrom: '2026-03-01',
      paidTo: '2026-03-31',
    });

    expect(result.invoices).toHaveLength(1);
    expect(result.totalCop).toBe(50000n);
    expect(result.count).toBe(1);
  });

  it('returns an empty result when nothing matches', async () => {
    const result = await listInvoices({ status: 'PENDING' });
    expect(result).toEqual({ invoices: [], totalCop: 0n, count: 0 });
  });
});
