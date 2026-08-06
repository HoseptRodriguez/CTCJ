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
