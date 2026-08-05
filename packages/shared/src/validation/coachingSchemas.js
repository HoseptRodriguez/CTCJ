import { z } from 'zod';

export const createNoteSchema = z.object({
  noteType: z.enum(['TRAINING', 'TECHNICAL', 'TACTICAL', 'RECOMMENDATION']),
  visibility: z.enum(['PRIVATE', 'PLAYER_VISIBLE']),
  content: z.string().trim().min(1).max(5000),
});
