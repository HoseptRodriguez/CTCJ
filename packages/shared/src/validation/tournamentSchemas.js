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

/** Administración: public dates and "Publicar" (opens registration on /torneos). */
export const tournamentPublicInfoSchema = z
  .object({
    startsOn: dateOnly.nullable().optional(),
    endsOn: dateOnly.nullable().optional(),
    publish: z.boolean().optional(),
  })
  .refine((v) => !v.startsOn || !v.endsOn || v.endsOn >= v.startsOn, {
    message: 'La fecha de cierre no puede ser anterior a la de inicio.',
    path: ['endsOn'],
  });

/** Staff: when and where a bracket match is played. */
export const scheduleTournamentMatchSchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }).nullable(),
  courtName: z.string().trim().max(60).nullable(),
});

export const recordTournamentMatchResultSchema = z.object({
  setsWonA: z.number().int().min(0).max(5),
  setsWonB: z.number().int().min(0).max(5),
  winnerSide: z.enum(['A', 'B']),
  playedAt: dateOnly,
  notes: z.string().trim().max(1000).optional(),
});
