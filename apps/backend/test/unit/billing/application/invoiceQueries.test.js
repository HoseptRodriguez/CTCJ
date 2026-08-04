import { beforeEach, describe, expect, it } from 'vitest';

import { createGetInvoice } from '../../../../src/modules/billing/application/useCases/getInvoice.js';
import { createListInvoicesByMembership } from '../../../../src/modules/billing/application/useCases/listInvoicesByMembership.js';
import { createGetMyInvoices } from '../../../../src/modules/billing/application/useCases/getMyInvoices.js';
import { InvoiceNotFound } from '../../../../src/modules/billing/application/errors/InvoiceNotFound.js';

import { createFakeInvoiceRepository, createFakeMembershipRepository } from './fakes.js';

function invoiceInput(membershipId, periodStart) {
  return [
    {
      membershipId,
      amountCop: 100000n,
      periodStart,
      periodEnd: new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 1),
      dueDate: periodStart,
      issuedAt: periodStart,
      generatedBy: 'admin-1',
    },
    [{ description: 'Iniciación', amountCop: 100000n }],
  ];
}

describe('getInvoice', () => {
  it('returns the invoice with its lines', async () => {
    const invoiceRepository = createFakeInvoiceRepository();
    const invoice = await invoiceRepository.create(
      ...invoiceInput('membership-1', new Date('2026-03-01')),
    );
    const getInvoice = createGetInvoice({ invoiceRepository });

    const result = await getInvoice({ invoiceId: invoice.id });
    expect(result.id).toBe(invoice.id);
    expect(result.lines).toHaveLength(1);
  });

  it('throws InvoiceNotFound for an unknown id', async () => {
    const getInvoice = createGetInvoice({ invoiceRepository: createFakeInvoiceRepository() });
    await expect(getInvoice({ invoiceId: 'does-not-exist' })).rejects.toThrow(InvoiceNotFound);
  });
});

describe('listInvoicesByMembership', () => {
  it("lists only the given membership's invoices", async () => {
    const invoiceRepository = createFakeInvoiceRepository();
    await invoiceRepository.create(...invoiceInput('membership-1', new Date('2026-03-01')));
    await invoiceRepository.create(...invoiceInput('membership-2', new Date('2026-03-01')));
    const listInvoicesByMembership = createListInvoicesByMembership({ invoiceRepository });

    const result = await listInvoicesByMembership({ membershipId: 'membership-1' });
    expect(result).toHaveLength(1);
    expect(result[0].membershipId).toBe('membership-1');
  });

  it('returns an empty array for a membership with no invoices', async () => {
    const listInvoicesByMembership = createListInvoicesByMembership({
      invoiceRepository: createFakeInvoiceRepository(),
    });
    expect(await listInvoicesByMembership({ membershipId: 'membership-1' })).toEqual([]);
  });
});

describe('getMyInvoices', () => {
  let membershipRepository;
  let invoiceRepository;
  let getMyInvoices;

  beforeEach(() => {
    membershipRepository = createFakeMembershipRepository();
    invoiceRepository = createFakeInvoiceRepository();
    getMyInvoices = createGetMyInvoices({ membershipRepository, invoiceRepository });
  });

  it("scopes strictly to the caller's own memberships' invoices", async () => {
    const mine = await membershipRepository.create({
      playerId: 'player-1',
      planId: 'plan-1',
      startDate: new Date('2026-01-01'),
      billingDay: 5,
      frequency: 'MONTHLY',
    });
    const someoneElses = await membershipRepository.create({
      playerId: 'player-2',
      planId: 'plan-1',
      startDate: new Date('2026-01-01'),
      billingDay: 5,
      frequency: 'MONTHLY',
    });
    await invoiceRepository.create(...invoiceInput(mine.id, new Date('2026-03-01')));
    await invoiceRepository.create(...invoiceInput(someoneElses.id, new Date('2026-03-01')));

    const result = await getMyInvoices({ playerId: 'player-1' });
    expect(result).toHaveLength(1);
    expect(result[0].membershipId).toBe(mine.id);
  });

  it('returns an empty array for a player with no memberships', async () => {
    expect(await getMyInvoices({ playerId: 'player-1' })).toEqual([]);
  });
});
