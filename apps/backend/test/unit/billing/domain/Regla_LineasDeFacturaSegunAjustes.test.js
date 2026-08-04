import { describe, expect, it } from 'vitest';

import { buildInvoiceLines } from '../../../../src/modules/billing/domain/services/buildInvoiceLines.js';

const PERIOD_START = new Date('2026-03-01');

function adjustment(overrides) {
  return {
    adjustmentType: 'DISCOUNT_ABS',
    value: '10000.00',
    reason: 'ajuste de prueba',
    validFrom: new Date('2026-01-01'),
    validTo: null,
    ...overrides,
  };
}

describe('Regla: líneas de factura según ajustes', () => {
  it('with no adjustments, produces a single base-price line equal to the total', () => {
    const { lines, totalCop } = buildInvoiceLines({
      basePriceCop: 100000n,
      adjustments: [],
      periodStart: PERIOD_START,
      planName: 'Iniciación',
    });

    expect(lines).toEqual([{ description: 'Iniciación', amountCop: 100000n }]);
    expect(totalCop).toBe(100000n);
  });

  it('DISCOUNT_PCT subtracts a rounded percentage of the base price', () => {
    const { lines, totalCop } = buildInvoiceLines({
      basePriceCop: 100000n,
      adjustments: [adjustment({ adjustmentType: 'DISCOUNT_PCT', value: '15' })],
      periodStart: PERIOD_START,
    });

    expect(lines[1].amountCop).toBe(-15000n);
    expect(totalCop).toBe(85000n);
  });

  it('DISCOUNT_ABS and SCHOLARSHIP both subtract the raw value, differing only in description', () => {
    const discount = buildInvoiceLines({
      basePriceCop: 100000n,
      adjustments: [adjustment({ adjustmentType: 'DISCOUNT_ABS', value: '20000' })],
      periodStart: PERIOD_START,
    });
    const scholarship = buildInvoiceLines({
      basePriceCop: 100000n,
      adjustments: [adjustment({ adjustmentType: 'SCHOLARSHIP', value: '20000' })],
      periodStart: PERIOD_START,
    });

    expect(discount.totalCop).toBe(80000n);
    expect(scholarship.totalCop).toBe(80000n);
    expect(discount.lines[1].description).toContain('Descuento');
    expect(scholarship.lines[1].description).toContain('Beca');
  });

  it('SURCHARGE adds the raw value as a positive line', () => {
    const { lines, totalCop } = buildInvoiceLines({
      basePriceCop: 100000n,
      adjustments: [adjustment({ adjustmentType: 'SURCHARGE', value: '5000' })],
      periodStart: PERIOD_START,
    });

    expect(lines[1].amountCop).toBe(5000n);
    expect(totalCop).toBe(105000n);
  });

  it('CUSTOM_PRICE replaces the base line entirely -- no separate base line is emitted', () => {
    const { lines, totalCop } = buildInvoiceLines({
      basePriceCop: 100000n,
      adjustments: [adjustment({ adjustmentType: 'CUSTOM_PRICE', value: '30000' })],
      periodStart: PERIOD_START,
      planName: 'Iniciación',
    });

    expect(lines).toHaveLength(1);
    expect(lines[0].amountCop).toBe(30000n);
    expect(totalCop).toBe(30000n);
  });

  it('multiple simultaneously-active adjustments are all summed, not assumed exclusive', () => {
    const { lines, totalCop } = buildInvoiceLines({
      basePriceCop: 100000n,
      adjustments: [
        adjustment({ adjustmentType: 'DISCOUNT_PCT', value: '10' }),
        adjustment({ adjustmentType: 'SURCHARGE', value: '2000' }),
      ],
      periodStart: PERIOD_START,
    });

    expect(lines).toHaveLength(3);
    expect(totalCop).toBe(100000n - 10000n + 2000n);
  });

  it('excludes an adjustment whose validFrom is after periodStart', () => {
    const { lines, totalCop } = buildInvoiceLines({
      basePriceCop: 100000n,
      adjustments: [adjustment({ validFrom: new Date('2026-04-01') })],
      periodStart: PERIOD_START,
    });

    expect(lines).toHaveLength(1);
    expect(totalCop).toBe(100000n);
  });

  it('excludes an adjustment whose validTo is before periodStart', () => {
    const { totalCop } = buildInvoiceLines({
      basePriceCop: 100000n,
      adjustments: [
        adjustment({ validFrom: new Date('2026-01-01'), validTo: new Date('2026-02-01') }),
      ],
      periodStart: PERIOD_START,
    });

    expect(totalCop).toBe(100000n);
  });

  it('includes an open-ended adjustment (validTo = null) still active at periodStart', () => {
    const { totalCop } = buildInvoiceLines({
      basePriceCop: 100000n,
      adjustments: [
        adjustment({ validFrom: new Date('2026-01-01'), validTo: null, value: '10000' }),
      ],
      periodStart: PERIOD_START,
    });

    expect(totalCop).toBe(90000n);
  });

  it('floors the total at 0 -- a fully-discounted invoice is free, never a rebate', () => {
    const { totalCop } = buildInvoiceLines({
      basePriceCop: 50000n,
      adjustments: [adjustment({ adjustmentType: 'DISCOUNT_ABS', value: '80000' })],
      periodStart: PERIOD_START,
    });

    expect(totalCop).toBe(0n);
  });
});
