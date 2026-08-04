const ADJUSTMENT_LABELS = {
  DISCOUNT_ABS: 'Descuento',
  SCHOLARSHIP: 'Beca',
  SURCHARGE: 'Recargo',
};

function toWholeCop(value) {
  // MembershipAdjustment.value is NUMERIC(12,2), returned by Prisma as a
  // string -- converted to a Number exactly once, here, so BigInt/Number
  // mixing (which throws in JS) never leaks into callers.
  return Math.round(Number(value));
}

function isActiveAt(adjustment, periodStart) {
  const startsInTime = adjustment.validFrom <= periodStart;
  const notYetEnded = adjustment.validTo == null || periodStart <= adjustment.validTo;
  return startsInTime && notYetEnded;
}

function describeAdjustment(adjustment) {
  const label =
    adjustment.adjustmentType === 'DISCOUNT_PCT'
      ? `Descuento (${toWholeCop(adjustment.value)}%)`
      : (ADJUSTMENT_LABELS[adjustment.adjustmentType] ?? adjustment.adjustmentType);
  return adjustment.reason ? `${label}: ${adjustment.reason}` : label;
}

function computeAdjustmentAmountCop(adjustment, basePriceCop) {
  const value = toWholeCop(adjustment.value);
  switch (adjustment.adjustmentType) {
    case 'DISCOUNT_PCT':
      return -BigInt(Math.round((Number(basePriceCop) * value) / 100));
    case 'DISCOUNT_ABS':
    case 'SCHOLARSHIP':
      return -BigInt(value);
    case 'SURCHARGE':
      return BigInt(value);
    default:
      throw new Error(`Unsupported adjustment type: ${adjustment.adjustmentType}`);
  }
}

/**
 * Pure domain operation: freezes a plan's base price + active adjustments
 * into invoice line items for a billing period. See
 * docs/03-MODELO-DE-DATOS.md §D2's invariant -- once built, these lines are
 * persisted as-is and never recomputed from a later price/adjustment change.
 *
 * All adjustments active at periodStart are summed (addAdjustment doesn't
 * enforce exclusivity between simultaneous adjustments, so this doesn't
 * assume it either) -- except CUSTOM_PRICE, which replaces the base line
 * entirely rather than adjusting it. The total is floored at 0: a
 * fully-discounted invoice is free, never a rebate.
 *
 * @param {{
 *   basePriceCop: bigint,
 *   adjustments: Array<{ adjustmentType: string, value: string|number, reason?: string, validFrom: Date, validTo: Date|null }>,
 *   periodStart: Date,
 *   planName?: string,
 * }} input
 * @returns {{ lines: Array<{ description: string, amountCop: bigint }>, totalCop: bigint }}
 */
export function buildInvoiceLines({ basePriceCop, adjustments, periodStart, planName = 'Plan' }) {
  const active = adjustments.filter((adjustment) => isActiveAt(adjustment, periodStart));
  const customPrice = active.find((adjustment) => adjustment.adjustmentType === 'CUSTOM_PRICE');

  const lines = [];

  if (customPrice) {
    const label = `${planName} (precio personalizado)`;
    lines.push({
      description: customPrice.reason ? `${label}: ${customPrice.reason}` : label,
      amountCop: BigInt(toWholeCop(customPrice.value)),
    });
  } else {
    lines.push({ description: planName, amountCop: BigInt(basePriceCop) });
  }

  for (const adjustment of active) {
    if (adjustment.adjustmentType === 'CUSTOM_PRICE') continue;
    lines.push({
      description: describeAdjustment(adjustment),
      amountCop: computeAdjustmentAmountCop(adjustment, basePriceCop),
    });
  }

  const rawTotal = lines.reduce((sum, line) => sum + line.amountCop, 0n);
  const totalCop = rawTotal < 0n ? 0n : rawTotal;

  return { lines, totalCop };
}
