import { z } from 'zod';

// Kept in sync with performance_ratings' area CHECK constraint. SLICE,
// FOOTWORK, FITNESS, MENTALITY added for the coach/player dashboards phase
// -- purely additive, the original six are unchanged. OVERHEAD already
// covers "smash" (same shot), not duplicated as a separate area.
export const PERFORMANCE_AREAS = [
  'FOREHAND',
  'BACKHAND',
  'SERVE',
  'RETURN',
  'VOLLEY',
  'OVERHEAD',
  'SLICE',
  'FOOTWORK',
  'FITNESS',
  'MENTALITY',
];

export const createNoteSchema = z.object({
  noteType: z.enum(['TRAINING', 'TECHNICAL', 'TACTICAL', 'RECOMMENDATION']),
  visibility: z.enum(['PRIVATE', 'PLAYER_VISIBLE']),
  content: z.string().trim().min(1).max(5000),
  // Optional: ties a note to a specific skill so a player knows exactly
  // what feedback is about, e.g. a SERVE-tagged note after a SERVE rating.
  area: z.enum(PERFORMANCE_AREAS).optional(),
});

export const recordPerformanceSnapshotSchema = z.object({
  ratings: z
    .record(z.enum(PERFORMANCE_AREAS), z.number().int().min(1).max(10))
    .refine((obj) => Object.keys(obj).length > 0, {
      message: 'At least one area rating is required.',
    }),
});
