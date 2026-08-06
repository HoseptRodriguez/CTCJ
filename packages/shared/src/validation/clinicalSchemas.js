import { z } from 'zod';

export const scheduleAppointmentSchema = z.object({
  playerId: z.string().uuid(),
  practitionerId: z.string().uuid(),
  start: z
    .string()
    .datetime({ offset: true })
    .transform((val) => new Date(val)),
  end: z
    .string()
    .datetime({ offset: true })
    .transform((val) => new Date(val)),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const createClinicalNoteSchema = z.object({
  noteType: z.enum(['FOLLOW_UP', 'RECOMMENDATION', 'SESSION_NOTE', 'GENERAL']),
  visibility: z.enum(['PRIVATE', 'PLAYER_VISIBLE']),
  content: z.string().trim().min(1).max(5000),
  appointmentId: z.string().uuid().optional(),
});

// Phase 15 (Physiotherapy) -------------------------------------------------

export const createRecoveryPlanSchema = z.object({
  title: z.string().trim().min(1).max(200),
  goal: z.string().trim().min(1).max(2000).optional(),
  visibility: z.enum(['PRIVATE', 'PLAYER_VISIBLE']),
});

export const discontinueRecoveryPlanSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const createMedicalHistoryEntrySchema = z.object({
  condition: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000).optional(),
  visibility: z.enum(['PRIVATE', 'PLAYER_VISIBLE']),
  // Date-only (e.g. from an <input type="date">), not a specific time --
  // unlike scheduleAppointmentSchema's start/end, which are real time slots.
  occurredAt: z
    .string()
    .date()
    .transform((val) => new Date(val))
    .optional(),
});
