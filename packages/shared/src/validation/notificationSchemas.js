import { z } from 'zod';

const channelSwitches = z
  .object({
    APP: z.boolean().optional(),
    EMAIL: z.boolean().optional(),
    PUSH: z.boolean().optional(),
  })
  .strict();

/** PUT /api/notifications/me/preferences */
export const notificationPreferencesSchema = z
  .object({
    categories: z
      .object({
        RESULTS_NOTES: channelSwitches.optional(),
        MY_TOURNAMENTS: channelSwitches.optional(),
        CLUB_NOTICES: channelSwitches.optional(),
        NEW_TOURNAMENTS: channelSwitches.optional(),
        PROMOTIONS: channelSwitches.optional(),
      })
      .strict()
      .optional(),
    dailyDigest: z.boolean().optional(),
  })
  .strict();

export const ANNOUNCEMENT_TITLE_MAX = 120;
export const ANNOUNCEMENT_BODY_MAX = 5000;
export const ANNOUNCEMENT_AUDIENCES = Object.freeze([
  'ALL',
  'PLAYERS',
  'CATEGORY',
  'TOURNAMENT',
  'GUARDIANS',
]);

const announcementBase = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Escribe un título de al menos 3 caracteres.')
    .max(
      ANNOUNCEMENT_TITLE_MAX,
      `El título puede tener máximo ${ANNOUNCEMENT_TITLE_MAX} caracteres.`,
    ),
  body: z
    .string()
    .trim()
    .min(1, 'Escribe el texto del comunicado.')
    .max(ANNOUNCEMENT_BODY_MAX, `El texto puede tener máximo ${ANNOUNCEMENT_BODY_MAX} caracteres.`),
  imageUrl: z
    .string()
    .max(500)
    .regex(/^(https:\/\/|\/uploads\/announcements\/)/, 'Imagen no válida.')
    .optional()
    .nullable(),
  imageAlt: z.string().trim().max(200).optional().nullable(),
  kind: z.enum(['SERVICE', 'PROMOTIONAL'], { message: 'Elige si es de servicio o promocional.' }),
  audienceType: z.enum(ANNOUNCEMENT_AUDIENCES, { message: 'Elige los destinatarios.' }),
  audienceCategory: z.enum(['SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA']).optional().nullable(),
  audienceTournamentId: z.string().uuid().optional().nullable(),
  // Empty = "Enviar ahora".
  scheduledFor: z.string().datetime({ offset: true }).optional().nullable(),
});

const refineAnnouncement = (value, ctx) => {
  if (value.imageUrl && !value.imageAlt) {
    ctx.addIssue({
      code: 'custom',
      path: ['imageAlt'],
      message: 'Describe la imagen para quien no puede verla.',
    });
  }
  if (value.audienceType === 'CATEGORY' && !value.audienceCategory) {
    ctx.addIssue({ code: 'custom', path: ['audienceCategory'], message: 'Elige la categoría.' });
  }
  if (value.audienceType === 'TOURNAMENT' && !value.audienceTournamentId) {
    ctx.addIssue({ code: 'custom', path: ['audienceTournamentId'], message: 'Elige el torneo.' });
  }
};

/** POST /api/admin/announcements and /preview */
export const announcementSchema = announcementBase.superRefine(refineAnnouncement);

/** POST /api/notifications/unsubscribe */
export const unsubscribeSchema = z.object({ token: z.string().min(10).max(300) });
