import { z } from 'zod';

import { PAYMENT_METHOD } from '../constants/payments.js';

export const holdSchema = z.object({
  courtId: z.string().uuid(),
  start: z
    .string()
    .datetime({ offset: true })
    .transform((val) => new Date(val)),
  end: z
    .string()
    .datetime({ offset: true })
    .transform((val) => new Date(val)),
});

// No paymentId -- confirming a HOLD is a pure state transition, unrelated to
// payment (see Phase 4 / recordPaymentSchema below for the real payment flow).
export const confirmSchema = z.object({
  reservationId: z.string().uuid(),
});

export const scheduleQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
});

export const setCourtPriceSchema = z.object({
  priceCop: z.number().int().positive(),
});

export const recordPaymentSchema = z.object({
  method: z.nativeEnum(PAYMENT_METHOD),
  notes: z.string().max(500).optional(),
});
