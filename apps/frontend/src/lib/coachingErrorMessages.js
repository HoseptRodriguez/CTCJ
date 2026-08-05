/** Maps the backend's coaching error codes (see apps/backend's coaching errorMapping.js) to Spanish UI copy. */
const COACHING_ERROR_MESSAGES = {
  player_not_eligible: 'Este usuario no tiene el rol Jugador, no se le puede crear una nota.',
};

export function describeCoachingError(err) {
  return COACHING_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
