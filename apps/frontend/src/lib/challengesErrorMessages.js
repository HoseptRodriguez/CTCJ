/** Maps the backend's challenges error codes (see apps/backend's challenges errorMapping.js) to Spanish UI copy. */
const CHALLENGES_ERROR_MESSAGES = {
  challenge_not_found: 'No se encontró ese reto.',
  self_challenge_forbidden: 'No puedes retarte a ti mismo.',
  player_not_eligible: 'Ambos jugadores deben tener el rol Jugador para poder retarse.',
  challenge_already_pending: 'Ya existe un reto pendiente entre ustedes.',
  invalid_challenge_state: 'Ese reto ya no está pendiente.',
  challenge_not_accepted: 'Solo puedes registrar un resultado para un reto aceptado.',
  invalid_score_submission: 'El resultado no puede terminar en empate.',
  invalid_match_result_state: 'Ese resultado ya fue confirmado.',
  match_recording_unavailable:
    'No hay temporada abierta actualmente, así que el resultado no se pudo confirmar.',
};

export function describeChallengesError(err) {
  return CHALLENGES_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
