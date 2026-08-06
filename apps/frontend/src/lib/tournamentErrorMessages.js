/** Maps the backend's tournament error codes (see apps/backend's tournament errorMapping.js) to Spanish UI copy. */
const TOURNAMENT_ERROR_MESSAGES = {
  tournament_not_found: 'No se encontró el torneo indicado.',
  participant_not_found: 'No se encontró ese participante en este torneo.',
  match_not_found: 'No se encontró el partido indicado.',
  player_not_eligible: 'Todos los participantes deben tener el rol Jugador.',
  player_already_registered: 'Un jugador no puede estar inscrito dos veces en el mismo torneo.',
  participant_count_mismatch: 'El número de jugadores no coincide con la modalidad del torneo.',
  match_not_ready: 'Este partido todavía espera el resultado de un partido anterior.',
  match_already_recorded: 'Este partido ya tiene un resultado registrado.',
  invalid_tournament_state: 'Esta acción no está disponible en el estado actual del torneo.',
  not_enough_participants: 'Se necesitan al menos 2 participantes para generar el sorteo.',
  invalid_winner_participant: 'El ganador debe coincidir con el lado que ganó más sets.',
};

export function describeTournamentError(err) {
  return TOURNAMENT_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
