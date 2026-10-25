const DATE_TIME = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
});
const DATE = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** The public page of a tournament (no login), and its brackets. */
export const tournamentPath = (id) => `/torneos/${id}`;
export const drawPath = (id) => `/torneos/${id}#cuadros`;

/**
 * What each outbox event says and to whom. The texts carry no sensitive
 * content -- a coach's note is announced, never copied into the email --
 * and no health data at all.
 *
 * @param {{
 *   notify: ReturnType<typeof import('./notify.js').createNotify>['notify'],
 *   contactDirectory: import('../ports/ContactDirectory.js').ContactDirectory,
 *   dispatchAnnouncement: (input: { announcementId: string, eventId: string }) => Promise<void>,
 * }} deps
 * @returns {Record<string, (event: { id: string, payload: any }) => Promise<void>>}
 */
export function createEventHandlers({ notify, contactDirectory, dispatchAnnouncement }) {
  const source = (event) => ({ sourceType: 'EVENT', sourceId: event.id });

  return {
    async COACH_NOTE_PUBLISHED(event) {
      const title = 'Tu entrenador publicó una nota para ti';
      await notify({
        recipientIds: [event.payload.playerId],
        type: 'COACH_NOTE_PUBLISHED',
        title,
        body: 'Está en Mi progreso.',
        linkPath: '/mi-ctcj/progreso',
        email: {
          subject: title,
          heading: title,
          paragraphs: ['Entra a Mi CTCJ para leerla.'],
          cta: { label: 'Ver mi progreso', path: '/mi-ctcj/progreso' },
        },
        ...source(event),
      });
    },

    async PERFORMANCE_RECORDED(event) {
      const title = 'Tu entrenador registró una nueva evaluación';
      await notify({
        recipientIds: [event.payload.playerId],
        type: 'PERFORMANCE_RECORDED',
        title,
        body: 'Mira cómo vas en Mi progreso.',
        linkPath: '/mi-ctcj/progreso',
        email: {
          subject: title,
          heading: title,
          paragraphs: ['Entra a Mi CTCJ para ver tus resultados.'],
          cta: { label: 'Ver mi progreso', path: '/mi-ctcj/progreso' },
        },
        ...source(event),
      });
    },

    async TOURNAMENT_OPENED(event) {
      const { tournamentId, name, startsOn } = event.payload;
      const title = `Inscripciones abiertas: ${name}`;
      const when = startsOn ? `Empieza el ${DATE.format(new Date(startsOn))}.` : null;
      // Everyone; the delivery plan keeps only who authorized this
      // promotional category and channel.
      const recipientIds = await contactDirectory.listNotifiableUserIds({ scope: 'ALL' });
      await notify({
        recipientIds,
        type: 'TOURNAMENT_OPENED',
        title,
        body: when,
        linkPath: tournamentPath(tournamentId),
        email: {
          subject: title,
          heading: title,
          paragraphs: [when, 'Pregunta en recepción cómo inscribirte.'].filter(Boolean),
          cta: { label: 'Ver el torneo', path: tournamentPath(tournamentId) },
        },
        ...source(event),
      });
    },

    async TOURNAMENT_DRAW_PUBLISHED(event) {
      const { tournamentId, name, playerIds } = event.payload;
      const title = `Se publicaron los cuadros de ${name}`;
      await notify({
        recipientIds: playerIds,
        type: 'TOURNAMENT_DRAW_PUBLISHED',
        title,
        body: 'Mira contra quién juegas.',
        linkPath: drawPath(tournamentId),
        email: {
          subject: title,
          heading: title,
          paragraphs: ['Ya puedes ver los cuadros y contra quién juegas.'],
          cta: { label: 'Ver los cuadros', path: drawPath(tournamentId) },
        },
        ...source(event),
      });
    },

    async TOURNAMENT_MATCH_CHANGED(event) {
      const { tournamentId, name, playerIds, scheduledAt, courtName, changes = [] } = event.payload;
      const title = `Cambió tu partido en ${name}`;
      const lines = [
        scheduledAt ? `Fecha y hora: ${DATE_TIME.format(new Date(scheduledAt))}.` : null,
        courtName ? `Cancha: ${courtName}.` : null,
        changes.includes('RIVAL') ? 'Ya se conoce tu rival: míralo en los cuadros.' : null,
      ].filter(Boolean);
      await notify({
        recipientIds: playerIds,
        type: 'TOURNAMENT_MATCH_CHANGED',
        title,
        body: lines.join(' '),
        linkPath: drawPath(tournamentId),
        email: {
          subject: title,
          heading: title,
          paragraphs: lines,
          cta: { label: 'Ver los cuadros', path: drawPath(tournamentId) },
        },
        ...source(event),
      });
    },

    async TOURNAMENT_MATCH_RESULT(event) {
      const { tournamentId, name, playerIds } = event.payload;
      const title = `Resultado de tu partido en ${name}`;
      await notify({
        recipientIds: playerIds,
        type: 'TOURNAMENT_MATCH_RESULT',
        title,
        body: 'El club registró el resultado.',
        linkPath: drawPath(tournamentId),
        email: {
          subject: title,
          heading: title,
          paragraphs: ['El club registró el resultado de tu partido.'],
          cta: { label: 'Ver resultados', path: drawPath(tournamentId) },
        },
        ...source(event),
      });
    },

    async TOURNAMENT_CANCELLED(event) {
      const { tournamentId, name, playerIds } = event.payload;
      const title = `Se canceló el torneo ${name}`;
      await notify({
        recipientIds: playerIds,
        type: 'TOURNAMENT_CANCELLED',
        title,
        body: 'Si tienes dudas, pregunta en recepción.',
        linkPath: tournamentPath(tournamentId),
        email: {
          subject: title,
          heading: title,
          paragraphs: ['El club canceló este torneo. Si tienes dudas, pregunta en recepción.'],
        },
        ...source(event),
      });
    },

    async ANNOUNCEMENT_PUBLISHED(event) {
      await dispatchAnnouncement({
        announcementId: event.payload.announcementId,
        eventId: event.id,
      });
    },
  };
}
