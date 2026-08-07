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
  // Booking on behalf of a linked minor (Phase 6) -- omitted or equal to the
  // caller's own id means "booking for myself", the default/only case before
  // this phase. See booking's GuardianshipProvider for the authorization check.
  holderUserId: z.string().uuid().optional(),
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

export const listPaymentsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
});

// Cash flow (financial dashboard) -- last N club-local months, newest last.
export const paymentsMonthlyQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});
