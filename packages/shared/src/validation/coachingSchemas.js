import { z } from 'zod';

export const createNoteSchema = z.object({
  noteType: z.enum(['TRAINING', 'TECHNICAL', 'TACTICAL', 'RECOMMENDATION']),
  visibility: z.enum(['PRIVATE', 'PLAYER_VISIBLE']),
  content: z.string().trim().min(1).max(5000),
});

export const recordPerformanceSnapshotSchema = z.object({
  ratings: z
    .record(
      z.enum(['FOREHAND', 'BACKHAND', 'SERVE', 'RETURN', 'VOLLEY', 'OVERHEAD']),
      z.number().int().min(1).max(10),
    )
    .refine((obj) => Object.keys(obj).length > 0, {
      message: 'At least one area rating is required.',
    }),
});
