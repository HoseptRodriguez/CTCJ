import { z } from 'zod';

import {
  ADJUSTMENT_TYPE,
  PLAYER_MEMBERSHIP_STATUS,
  PRICE_CHANGE_NOTICE_DAYS,
  PRICE_LIMITS,
} from '../constants/billing.js';
import { PAYMENT_METHOD } from '../constants/payments.js';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format');

const planName = z
  .string({ required_error: 'Escribe el nombre del plan.' })
  .trim()
  .min(1, 'Escribe el nombre del plan.')
  .max(120, 'El nombre puede tener hasta 120 caracteres.');
const planDescription = z
  .string()
  .trim()
  .max(500, 'La descripción puede tener hasta 500 caracteres.');

/** Whole pesos, above 0 -- shared by plans and courts. */
export const priceCopSchema = z
  .number({ invalid_type_error: 'Escribe el precio en pesos.' })
  .int('El precio va en pesos, sin decimales.')
  .min(PRICE_LIMITS.MIN_COP, 'El precio debe ser mayor que 0.')
  .max(PRICE_LIMITS.MAX_COP, 'Ese precio es demasiado alto; revisa los ceros.');

// The code is generated from the name when the plan is created and never
// changes (invoices and reports refer to it); it is not accepted here.
export const createPlanSchema = z.object({
  name: planName,
  description: planDescription.optional(),
});

export const updatePlanSchema = z.object({
  name: planName,
  description: planDescription.nullable().optional(),
});

export const setPlanActiveSchema = z.object({
  isActive: z.boolean(),
});

// validFrom is optional: without it the price starts on the earliest day
// allowed (today, or after the notice period when the plan has players).
export const setPlanPriceSchema = z.object({
  basePriceCop: priceCopSchema,
  validFrom: dateOnly.optional(),
});

export const setPriceNoticeDaysSchema = z.object({
  days: z
    .number()
    .int()
    .min(PRICE_CHANGE_NOTICE_DAYS.MIN)
    .max(
      PRICE_CHANGE_NOTICE_DAYS.MAX,
      `El aviso puede ser de hasta ${PRICE_CHANGE_NOTICE_DAYS.MAX} días.`,
    ),
});

export const enrollPlayerSchema = z.object({
  playerId: z.string().uuid(),
  planId: z.string().uuid(),
  startDate: dateOnly,
  billingDay: z.number().int().min(1).max(28),
  frequency: z.string().trim().max(20).optional(),
});

export const setPlayerMembershipStatusSchema = z.object({
  status: z.nativeEnum(PLAYER_MEMBERSHIP_STATUS),
});

export const addAdjustmentSchema = z.object({
  adjustmentType: z.nativeEnum(ADJUSTMENT_TYPE),
  value: z.number(),
  reason: z.string().trim().min(1).max(500),
  validFrom: dateOnly,
  validTo: dateOnly.optional(),
});

export const listMembershipsQuerySchema = z.object({
  playerId: z.string().uuid(),
});

export const generateInvoiceSchema = z.object({
  periodStart: dateOnly,
  periodEnd: dateOnly,
  dueDate: dateOnly,
});

export const recordInvoicePaymentSchema = z.object({
  method: z.nativeEnum(PAYMENT_METHOD),
  notes: z.string().max(500).optional(),
});

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const listInvoicesQuerySchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});

// Cash flow (financial dashboard) -- last N club-local months, newest last.
export const invoicesMonthlyQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});
