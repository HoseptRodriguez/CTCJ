import { describe, expect, it } from 'vitest';

import { Invoice } from '../../../../src/modules/billing/domain/entities/Invoice.js';
import { InvalidInvoiceState } from '../../../../src/modules/billing/domain/errors/InvalidInvoiceState.js';

function buildInvoice(status = 'PENDING') {
  return new Invoice({
    id: 'invoice-1',
    membershipId: 'membership-1',
    status,
    amountCop: 50000n,
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-02-01'),
    dueDate: new Date('2026-01-05'),
    issuedAt: new Date('2026-01-01'),
  });
}

describe('Regla: transiciones de estado de factura', () => {
  it('pay() is legal from PENDING and freezes paidAmountCop to amountCop', () => {
    const invoice = buildInvoice('PENDING');
    const now = new Date('2026-01-03');
    invoice.pay({ method: 'CASH', notes: 'efectivo en recepción', paidBy: 'staff-1', now });

    expect(invoice.status).toBe('PAID');
    expect(invoice.paidAmountCop).toBe(50000n);
    expect(invoice.paidMethod).toBe('CASH');
    expect(invoice.paidBy).toBe('staff-1');
    expect(invoice.paidAt).toBe(now);
    expect(invoice.paidNotes).toBe('efectivo en recepción');
  });

  it('pay() throws when not currently PENDING', () => {
    expect(() =>
      buildInvoice('PAID').pay({ method: 'CASH', paidBy: 'staff-1', now: new Date() }),
    ).toThrow(InvalidInvoiceState);
    expect(() =>
      buildInvoice('CANCELLED').pay({ method: 'CASH', paidBy: 'staff-1', now: new Date() }),
    ).toThrow(InvalidInvoiceState);
  });

  it('cancel() is legal from PENDING', () => {
    const invoice = buildInvoice('PENDING');
    const now = new Date('2026-01-03');
    invoice.cancel({ cancelledBy: 'staff-1', reason: 'generada por error', now });

    expect(invoice.status).toBe('CANCELLED');
    expect(invoice.cancelledAt).toBe(now);
    expect(invoice.cancelledBy).toBe('staff-1');
    expect(invoice.cancelReason).toBe('generada por error');
  });

  it('cancel() throws when already PAID (a paid invoice cannot be cancelled)', () => {
    expect(() =>
      buildInvoice('PAID').cancel({ cancelledBy: 'staff-1', reason: 'x', now: new Date() }),
    ).toThrow(InvalidInvoiceState);
  });

  it('cancel() throws when already CANCELLED', () => {
    expect(() =>
      buildInvoice('CANCELLED').cancel({ cancelledBy: 'staff-1', reason: 'x', now: new Date() }),
    ).toThrow(InvalidInvoiceState);
  });
});
