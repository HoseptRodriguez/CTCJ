import { z } from 'zod';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format');

const CATEGORY = ['SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA'];
const MODALITY = ['SINGLES', 'DOBLES'];

export const createSeasonSchema = z.object({
  name: z.string().trim().min(1).max(60),
  year: z.number().int().min(2000).max(2100),
  seasonNumber: z.union([z.literal(1), z.literal(2)]),
  startDate: dateOnly,
});

const participantSide = z.array(z.string().uuid()).min(1).max(2);

export const recordMatchSchema = z
  .object({
    seasonId: z.string().uuid(),
    category: z.enum(CATEGORY),
    modality: z.enum(MODALITY),
    participantsA: participantSide,
    participantsB: participantSide,
    winnerSide: z.enum(['A', 'B']),
    setsWonA: z.number().int().min(0).max(5),
    setsWonB: z.number().int().min(0).max(5),
    playedAt: dateOnly,
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => {
      const expected = data.modality === 'SINGLES' ? 1 : 2;
      return data.participantsA.length === expected && data.participantsB.length === expected;
    },
    { message: 'SINGLES matches need 1 participant per side, DOBLES need 2.' },
  );

export const voidMatchSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const standingsQuerySchema = z.object({
  seasonId: z.string().uuid().optional(),
  category: z.enum(CATEGORY),
  modality: z.enum(MODALITY),
});

export const matchesQuerySchema = standingsQuerySchema.extend({
  playerId: z.string().uuid().optional(),
});
