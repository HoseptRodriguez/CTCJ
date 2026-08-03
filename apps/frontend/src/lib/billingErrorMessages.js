/** Maps the backend's billing error codes (see apps/backend's billing errorMapping.js) to Spanish UI copy. */
const BILLING_ERROR_MESSAGES = {
  plan_not_found: 'No se encontró ese plan.',
  plan_code_already_exists: 'Ya existe un plan con ese código.',
  membership_not_found: 'No se encontró esa membresía.',
  player_not_eligible: 'Este usuario no tiene el rol Jugador, no se le puede inscribir en un plan.',
  plan_not_active: 'Este plan no está activo, no admite nuevas inscripciones.',
  invalid_membership_status_transition: 'Ese cambio de estado no es válido.',
  invalid_price_valid_from: 'La nueva fecha de vigencia debe ser posterior a la del precio actual.',
  negative_price: 'El precio no puede ser negativo.',
};

export function describeBillingError(err) {
  return BILLING_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
