import { z } from 'zod';

export const createChallengeSchema = z.object({
  opponentUserId: z.string().uuid(),
  message: z.string().trim().max(500).optional(),
});

const CATEGORY = ['SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA'];
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format');

/**
 * "My sets / their sets" framing, not competition's A/B -- the submitting
 * player never has to think about who's "challenger" vs "opponent". The
 * use case translates this into competition's fixed A=challenger/B=opponent
 * frame before comparing the two players' submissions.
 */
export const submitMatchScoreSchema = z
  .object({
    category: z.enum(CATEGORY),
    mySetsWon: z.number().int().min(0).max(5),
    opponentSetsWon: z.number().int().min(0).max(5),
    playedAt: dateOnly,
  })
  .refine((data) => data.mySetsWon !== data.opponentSetsWon, {
    message: 'Scores cannot tie.',
  });
