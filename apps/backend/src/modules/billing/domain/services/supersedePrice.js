import { InvalidPriceValidFrom } from '../errors/InvalidPriceValidFrom.js';
import { NegativePrice } from '../errors/NegativePrice.js';

/**
 * Pure domain operation: computes what it takes to supersede a plan's
 * current price with a new one, preserving the append-only price-history
 * invariant (see docs/03-MODELO-DE-DATOS.md §D2 -- "cambiar un precio hoy
 * nunca altera lo facturado ayer"). The current vigente row (if any) is
 * closed exactly where the new one starts; existing rows are never edited
 * otherwise. The application layer persists both halves in one transaction.
 *
 * @param {{id: string, validFrom: Date}|null} currentVigentePrice
 * @param {{ basePriceCop: number|bigint, validFrom: Date }} newPriceInput
 * @returns {{ closePrevious: {id: string, validTo: Date}|null, newRow: { basePriceCop: number|bigint, validFrom: Date } }}
 */
export function supersedePrice(currentVigentePrice, newPriceInput) {
  if (newPriceInput.basePriceCop < 0) {
    throw new NegativePrice();
  }
  if (currentVigentePrice && newPriceInput.validFrom <= currentVigentePrice.validFrom) {
    throw new InvalidPriceValidFrom();
  }

  return {
    closePrevious: currentVigentePrice
      ? { id: currentVigentePrice.id, validTo: newPriceInput.validFrom }
      : null,
    newRow: { basePriceCop: newPriceInput.basePriceCop, validFrom: newPriceInput.validFrom },
  };
}
