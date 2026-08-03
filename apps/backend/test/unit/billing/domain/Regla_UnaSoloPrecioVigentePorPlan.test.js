import { describe, expect, it } from 'vitest';

import { supersedePrice } from '../../../../src/modules/billing/domain/services/supersedePrice.js';
import { InvalidPriceValidFrom } from '../../../../src/modules/billing/domain/errors/InvalidPriceValidFrom.js';
import { NegativePrice } from '../../../../src/modules/billing/domain/errors/NegativePrice.js';

describe('Regla: un solo precio vigente por plan', () => {
  it('setting a first price on a plan with none produces one open-ended row, no closure', () => {
    const result = supersedePrice(null, {
      basePriceCop: 50000,
      validFrom: new Date('2026-01-01'),
    });
    expect(result.closePrevious).toBeNull();
    expect(result.newRow).toEqual({ basePriceCop: 50000, validFrom: new Date('2026-01-01') });
  });

  it('setting a new price closes the previous vigente row at the new validFrom', () => {
    const current = { id: 'price-1', validFrom: new Date('2026-01-01') };
    const result = supersedePrice(current, {
      basePriceCop: 60000,
      validFrom: new Date('2026-03-01'),
    });
    expect(result.closePrevious).toEqual({ id: 'price-1', validTo: new Date('2026-03-01') });
    expect(result.newRow.basePriceCop).toBe(60000);
  });

  it("rejects a validFrom on or before the currently open row's validFrom", () => {
    const current = { id: 'price-1', validFrom: new Date('2026-03-01') };
    expect(() =>
      supersedePrice(current, { basePriceCop: 60000, validFrom: new Date('2026-03-01') }),
    ).toThrow(InvalidPriceValidFrom);
    expect(() =>
      supersedePrice(current, { basePriceCop: 60000, validFrom: new Date('2026-01-01') }),
    ).toThrow(InvalidPriceValidFrom);
  });

  it('rejects a negative basePriceCop', () => {
    expect(() =>
      supersedePrice(null, { basePriceCop: -1, validFrom: new Date('2026-01-01') }),
    ).toThrow(NegativePrice);
  });
});
