/** Maps the backend's competition error codes (see apps/backend's competition errorMapping.js) to Spanish UI copy. */
const COMPETITION_ERROR_MESSAGES = {
  season_not_found: 'No se encontró la temporada indicada.',
  season_already_open: 'Este club ya tiene una temporada abierta.',
  match_not_found: 'No se encontró el partido indicado.',
  player_not_eligible: 'Todos los participantes deben tener el rol Jugador.',
  invalid_season_state: 'La temporada no está abierta.',
  invalid_match_state: 'Este partido ya fue anulado.',
  invalid_participant_count: 'El número de participantes no coincide con la modalidad.',
  duplicate_participant: 'Un jugador no puede aparecer más de una vez en el mismo partido.',
  invalid_winner_side: 'El ganador debe coincidir con el lado que ganó más sets.',
};

export function describeCompetitionError(err) {
  return COMPETITION_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
