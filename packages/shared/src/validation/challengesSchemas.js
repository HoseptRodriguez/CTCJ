import { z } from 'zod';

export const createChallengeSchema = z.object({
  opponentUserId: z.string().uuid(),
  message: z.string().trim().max(500).optional(),
});
