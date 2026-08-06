import { z } from 'zod';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format');

// Reuses competition's category/modality vocabulary -- tournaments share the
// exact same values (SEGUNDA/TERCERA/CUARTA/QUINTA, SINGLES/DOBLES), no need
// to redefine an identical enum.
const CATEGORY = ['SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA'];
const MODALITY = ['SINGLES', 'DOBLES'];

export const createTournamentSchema = z.object({
  name: z.string().trim().min(1).max(60),
  category: z.enum(CATEGORY),
  modality: z.enum(MODALITY),
});

export const addTournamentParticipantSchema = z.object({
  playerIds: z.array(z.string().uuid()).min(1).max(2),
});

export const recordTournamentMatchResultSchema = z.object({
  setsWonA: z.number().int().min(0).max(5),
  setsWonB: z.number().int().min(0).max(5),
  winnerSide: z.enum(['A', 'B']),
  playedAt: dateOnly,
  notes: z.string().trim().max(1000).optional(),
});
