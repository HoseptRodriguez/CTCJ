import { beforeEach, describe, expect, it } from 'vitest';

import { createCancelInvoice } from '../../../../src/modules/billing/application/useCases/cancelInvoice.js';
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

describe('cancelInvoice', () => {
  let invoiceRepository;
  let cancelInvoice;
  let recordInvoicePayment;

  beforeEach(() => {
    invoiceRepository = createFakeInvoiceRepository();
    cancelInvoice = createCancelInvoice({ invoiceRepository, clock: createFakeClock() });
    recordInvoicePayment = createRecordInvoicePayment({
      invoiceRepository,
      clock: createFakeClock(),
    });
  });

  it('cancels a PENDING invoice with a mandatory reason', async () => {
    const invoice = await seedPendingInvoice(invoiceRepository);

    const cancelled = await cancelInvoice({
      invoiceId: invoice.id,
      cancelledByUserId: 'admin-1',
      reason: 'generada por error',
    });

    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledBy).toBe('admin-1');
    expect(cancelled.cancelReason).toBe('generada por error');
  });

  it('throws InvalidInvoiceState when the invoice is already PAID', async () => {
    const invoice = await seedPendingInvoice(invoiceRepository);
    await recordInvoicePayment({
      invoiceId: invoice.id,
      method: 'CASH',
      recordedByUserId: 'staff-1',
    });

    await expect(
      cancelInvoice({ invoiceId: invoice.id, cancelledByUserId: 'admin-1', reason: 'x' }),
    ).rejects.toThrow(InvalidInvoiceState);
  });

  it('throws InvalidInvoiceState when the invoice is already CANCELLED', async () => {
    const invoice = await seedPendingInvoice(invoiceRepository);
    await cancelInvoice({ invoiceId: invoice.id, cancelledByUserId: 'admin-1', reason: 'x' });

    await expect(
      cancelInvoice({ invoiceId: invoice.id, cancelledByUserId: 'admin-1', reason: 'x' }),
    ).rejects.toThrow(InvalidInvoiceState);
  });

  it('throws InvoiceNotFound for an unknown id', async () => {
    await expect(
      cancelInvoice({ invoiceId: 'does-not-exist', cancelledByUserId: 'admin-1', reason: 'x' }),
    ).rejects.toThrow(InvoiceNotFound);
  });
});
