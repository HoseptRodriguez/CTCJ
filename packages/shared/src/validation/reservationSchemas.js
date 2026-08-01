import { z } from 'zod';

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

export const confirmSchema = z.object({
  reservationId: z.string().uuid(),
  paymentId: z.string().uuid(),
});

export const scheduleQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
});
