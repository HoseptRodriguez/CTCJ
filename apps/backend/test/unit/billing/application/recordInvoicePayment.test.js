import { beforeEach, describe, expect, it } from 'vitest';

import { createRecordInvoicePayment } from '../../../../src/modules/billing/application/useCases/recordInvoicePayment.js';
import { InvoiceNotFound } from '../../../../src/modules/billing/application/errors/InvoiceNotFound.js';
import { InvalidInvoiceState } from '../../../../src/modules/billing/domain/errors/InvalidInvoiceState.js';

import { createFakeInvoiceRepository, createFakeClock } from './fakes.js';

async function seedPendingInvoice(invoiceRepository) {
  return invoiceRepository.create(
    {
      membershipId: 'membership-1',
      amountCop: 100000n,
      periodStart: new Date('2026-03-01'),
      periodEnd: new Date('2026-04-01'),
      dueDate: new Date('2026-03-05'),
      issuedAt: new Date('2026-03-01'),
      generatedBy: 'admin-1',
    },
    [{ description: 'Iniciación', amountCop: 100000n }],
  );
}

describe('recordInvoicePayment', () => {
  let invoiceRepository;
  let recordInvoicePayment;

  beforeEach(() => {
    invoiceRepository = createFakeInvoiceRepository();
    recordInvoicePayment = createRecordInvoicePayment({
      invoiceRepository,
      clock: createFakeClock(),
    });
  });

  it('records a payment on a PENDING invoice, amount taken from invoice.amountCop', async () => {
    const invoice = await seedPendingInvoice(invoiceRepository);

    const paid = await recordInvoicePayment({
      invoiceId: invoice.id,
      method: 'CASH',
      notes: 'pago en recepción',
      recordedByUserId: 'staff-1',
    });

    expect(paid.status).toBe('PAID');
    expect(paid.paidAmountCop).toBe(100000n);
    expect(paid.paidMethod).toBe('CASH');
    expect(paid.paidBy).toBe('staff-1');
  });

  it('throws InvalidInvoiceState for an already-PAID invoice', async () => {
    const invoice = await seedPendingInvoice(invoiceRepository);
    await recordInvoicePayment({
      invoiceId: invoice.id,
      method: 'CASH',
      recordedByUserId: 'staff-1',
    });

    await expect(
      recordInvoicePayment({ invoiceId: invoice.id, method: 'CASH', recordedByUserId: 'staff-1' }),
    ).rejects.toThrow(InvalidInvoiceState);
  });

  it('throws InvoiceNotFound for an unknown id', async () => {
    await expect(
      recordInvoicePayment({
        invoiceId: 'does-not-exist',
        method: 'CASH',
        recordedByUserId: 'staff-1',
      }),
    ).rejects.toThrow(InvoiceNotFound);
  });
});
