export const NOTIFICATION_TYPE = Object.freeze({
  CHALLENGE_RECEIVED: 'CHALLENGE_RECEIVED',
  CHALLENGE_ACCEPTED: 'CHALLENGE_ACCEPTED',
  CHALLENGE_REJECTED: 'CHALLENGE_REJECTED',
  CHALLENGE_CANCELLED: 'CHALLENGE_CANCELLED',
  CHALLENGE_RESULT_SUBMITTED: 'CHALLENGE_RESULT_SUBMITTED',
  CHALLENGE_RESULT_MISMATCH: 'CHALLENGE_RESULT_MISMATCH',
  CHALLENGE_RESULT_CONFIRMED: 'CHALLENGE_RESULT_CONFIRMED',
  POST_COMMENT_RECEIVED: 'POST_COMMENT_RECEIVED',
  PLAN_PRICE_CHANGED: 'PLAN_PRICE_CHANGED',
  COACH_NOTE_PUBLISHED: 'COACH_NOTE_PUBLISHED',
  PERFORMANCE_RECORDED: 'PERFORMANCE_RECORDED',
  TOURNAMENT_OPENED: 'TOURNAMENT_OPENED',
  TOURNAMENT_DRAW_PUBLISHED: 'TOURNAMENT_DRAW_PUBLISHED',
  TOURNAMENT_MATCH_CHANGED: 'TOURNAMENT_MATCH_CHANGED',
  TOURNAMENT_MATCH_RESULT: 'TOURNAMENT_MATCH_RESULT',
  TOURNAMENT_CANCELLED: 'TOURNAMENT_CANCELLED',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
});

/**
 * Ley 2300 de 2023. SERVICE: about something the person already has with
 * the club (their results, their tournaments, their booking, invoice or
 * membership, operational notices) -- any day, 7:00 a. m. to 9:00 p. m.
 * PROMOTIONAL: offers and news -- only with the person's authorization and
 * only in the promotional hours (see colombianCalendar.js).
 */
export const NOTIFICATION_KIND = Object.freeze({
  SERVICE: 'SERVICE',
  PROMOTIONAL: 'PROMOTIONAL',
});

export const NOTIFICATION_CATEGORY = Object.freeze({
  RESULTS_NOTES: 'RESULTS_NOTES',
  MY_TOURNAMENTS: 'MY_TOURNAMENTS',
  CLUB_NOTICES: 'CLUB_NOTICES',
  ACCOUNT: 'ACCOUNT',
  ACTIVITY: 'ACTIVITY',
  NEW_TOURNAMENTS: 'NEW_TOURNAMENTS',
  PROMOTIONS: 'PROMOTIONS',
});

/**
 * What each category is, for the switches in Mi CTCJ > Notificaciones.
 * `switchable: false`: always sent (reservas, facturas y membresía, and the
 * in-app-only activity of challenges and the Community).
 */
export const NOTIFICATION_CATEGORIES = Object.freeze({
  RESULTS_NOTES: {
    kind: 'SERVICE',
    switchable: true,
    label: 'Resultados y notas',
    description: 'Cuando tu entrenador publica una nota o una evaluación para ti.',
  },
  MY_TOURNAMENTS: {
    kind: 'SERVICE',
    switchable: true,
    label: 'Torneos en los que participo',
    description: 'Cuadros publicados, cambios de horario o cancha, resultados y cancelaciones.',
  },
  CLUB_NOTICES: {
    kind: 'SERVICE',
    switchable: true,
    label: 'Comunicados del club',
    description: 'Avisos del día a día, como cierre de canchas por lluvia o mantenimiento.',
  },
  NEW_TOURNAMENTS: {
    kind: 'PROMOTIONAL',
    switchable: true,
    label: 'Nuevos torneos e inscripciones',
    description: 'Cuando el club abre la inscripción a un torneo nuevo.',
  },
  PROMOTIONS: {
    kind: 'PROMOTIONAL',
    switchable: true,
    label: 'Promociones',
    description: 'Promociones, eventos y novedades del club.',
  },
  ACCOUNT: {
    kind: 'SERVICE',
    switchable: false,
    label: 'Reservas, facturas y membresía',
    description: 'Siempre te avisamos de cambios en lo que ya tienes con el club.',
  },
  ACTIVITY: {
    kind: 'SERVICE',
    switchable: false,
    label: 'Retos y comunidad',
    description: 'Solo dentro de la app.',
  },
});

/** Service categories whose switches are stored in notification_preferences. */
export const SERVICE_PREFERENCE_CATEGORIES = Object.freeze([
  'RESULTS_NOTES',
  'MY_TOURNAMENTS',
  'CLUB_NOTICES',
]);
/** Promotional categories: part of the MARKETING consent (details.categories). */
export const PROMOTIONAL_CATEGORIES = Object.freeze(['NEW_TOURNAMENTS', 'PROMOTIONS']);

/**
 * Delivery channels. PUSH is ready for the PWA phase: its switch stays
 * hidden (`available: false`) and nothing is sent through it yet.
 */
export const NOTIFICATION_CHANNEL = Object.freeze({ APP: 'APP', EMAIL: 'EMAIL', PUSH: 'PUSH' });
export const NOTIFICATION_CHANNELS = Object.freeze([
  { id: 'APP', label: 'Dentro de la app', available: true },
  { id: 'EMAIL', label: 'Correo', available: true },
  { id: 'PUSH', label: 'En el celular (push)', available: false },
]);

const TYPE_CATEGORY = Object.freeze({
  CHALLENGE_RECEIVED: 'ACTIVITY',
  CHALLENGE_ACCEPTED: 'ACTIVITY',
  CHALLENGE_REJECTED: 'ACTIVITY',
  CHALLENGE_CANCELLED: 'ACTIVITY',
  CHALLENGE_RESULT_SUBMITTED: 'ACTIVITY',
  CHALLENGE_RESULT_MISMATCH: 'ACTIVITY',
  CHALLENGE_RESULT_CONFIRMED: 'ACTIVITY',
  POST_COMMENT_RECEIVED: 'ACTIVITY',
  PLAN_PRICE_CHANGED: 'ACCOUNT',
  COACH_NOTE_PUBLISHED: 'RESULTS_NOTES',
  PERFORMANCE_RECORDED: 'RESULTS_NOTES',
  TOURNAMENT_DRAW_PUBLISHED: 'MY_TOURNAMENTS',
  TOURNAMENT_MATCH_CHANGED: 'MY_TOURNAMENTS',
  TOURNAMENT_MATCH_RESULT: 'MY_TOURNAMENTS',
  TOURNAMENT_CANCELLED: 'MY_TOURNAMENTS',
  TOURNAMENT_OPENED: 'NEW_TOURNAMENTS',
});

/**
 * Service or promotional, and in which category. An announcement is what
 * the club says it is: SERVICE -> "Comunicados del club", PROMOTIONAL ->
 * "Promociones".
 *
 * @param {string} type  NOTIFICATION_TYPE
 * @param {{ announcementKind?: 'SERVICE'|'PROMOTIONAL' }} [options]
 * @returns {{ kind: 'SERVICE'|'PROMOTIONAL', category: string }}
 */
export function classifyNotification(type, { announcementKind } = {}) {
  let category = TYPE_CATEGORY[type];
  if (type === 'ANNOUNCEMENT') {
    if (!announcementKind)
      throw new Error('An announcement needs its kind (SERVICE or PROMOTIONAL)');
    category = announcementKind === 'PROMOTIONAL' ? 'PROMOTIONS' : 'CLUB_NOTICES';
  }
  if (!category) throw new Error(`Unknown notification type: ${type}`);
  return { kind: NOTIFICATION_CATEGORIES[category].kind, category };
}

/** Types that also go out by email (the rest are in-app only). */
export const EMAIL_NOTIFICATION_TYPES = Object.freeze(
  Object.keys(NOTIFICATION_TYPE).filter(
    (t) => t === 'ANNOUNCEMENT' || !['ACTIVITY'].includes(TYPE_CATEGORY[t]),
  ),
);
