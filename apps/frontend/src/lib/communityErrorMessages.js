/** Maps the backend's community error codes (see apps/backend's community errorMapping.js) to Spanish UI copy. */
const COMMUNITY_ERROR_MESSAGES = {
  post_not_found: 'No se encontró esa publicación.',
  comment_not_found: 'No se encontró ese comentario.',
  content_not_found: 'No se encontró ese contenido.',
  report_not_found: 'No se encontró ese reporte.',
  report_already_pending: 'Ya reportaste este contenido.',
  player_not_eligible: 'Debes tener el rol Jugador para usar la comunidad.',
};

export function describeCommunityError(err) {
  return COMMUNITY_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
