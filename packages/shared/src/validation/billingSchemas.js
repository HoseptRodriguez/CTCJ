import { z } from 'zod';

import { ADJUSTMENT_TYPE, PLAYER_MEMBERSHIP_STATUS } from '../constants/billing.js';
import { PAYMENT_METHOD } from '../constants/payments.js';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format');

export const createPlanSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional(),
});

export const setPlanPriceSchema = z.object({
  basePriceCop: z.number().int().nonnegative(),
  validFrom: dateOnly,
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
