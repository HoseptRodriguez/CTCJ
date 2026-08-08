/** Maps the backend's goals error codes (see apps/backend's goals errorMapping.js) to Spanish UI copy. */
const GOALS_ERROR_MESSAGES = {
  goal_not_found: 'No se encontró esa meta.',
  invalid_goal_target: 'El objetivo de la meta no es válido para el tipo seleccionado.',
  invalid_goal_state: 'Esta meta ya no está activa.',
};

export function describeGoalsError(err) {
  return GOALS_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
