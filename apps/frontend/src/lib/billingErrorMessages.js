/** Maps the backend's billing error codes (see apps/backend's billing errorMapping.js) to Spanish UI copy. */
const BILLING_ERROR_MESSAGES = {
  plan_not_found: 'No se encontró ese plan.',
  plan_code_already_exists: 'Ya existe un plan con ese código.',
  plan_name_already_exists: 'Ya existe un plan con ese nombre. Elige otro.',
  price_start_too_early:
    'Los jugadores de este plan deben recibir el aviso con tiempo: elige una fecha más adelante.',
  price_change_pending:
    'Este plan ya tiene un cambio de precio programado. Cancélalo antes de programar otro.',
  no_scheduled_price: 'Este plan no tiene un cambio de precio programado.',
  membership_not_found: 'No se encontró esa membresía.',
  player_not_eligible: 'Este usuario no tiene el rol Jugador, no se le puede inscribir en un plan.',
  plan_not_active: 'Este plan no está activo, no admite nuevas inscripciones.',
  invalid_membership_status_transition: 'Ese cambio de estado no es válido.',
  invalid_price_valid_from: 'La nueva fecha de vigencia debe ser posterior a la del precio actual.',
  price_not_positive: 'El precio debe ser mayor que 0.',
  membership_not_active: 'Esta membresía no está activa, no se le puede generar una factura.',
  plan_price_not_set: 'Este plan no tiene un precio configurado, no se puede generar la factura.',
  invoice_already_exists: 'Ya existe una factura para esta membresía en ese período.',
  invoice_not_found: 'No se encontró esa factura.',
  invalid_invoice_state: 'Esa acción no es válida para el estado actual de la factura.',
};

// Dates come as YYYY-MM-DD; read at noon UTC so they never shift a day.
const LONG_DATE = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const longDate = (key) => LONG_DATE.format(new Date(`${key}T12:00:00Z`));

export function describeBillingError(err) {
  // The refusals that carry a date say which one.
  if (err?.code === 'price_start_too_early' && err.details?.earliestValidFrom) {
    return `Los jugadores de este plan deben recibir el aviso con tiempo: el nuevo precio puede empezar desde el ${longDate(err.details.earliestValidFrom)}.`;
  }
  if (err?.code === 'price_change_pending' && err.details?.pendingValidFrom) {
    return `Este plan ya tiene un cambio de precio programado para el ${longDate(err.details.pendingValidFrom)}. Cancélalo antes de programar otro.`;
  }
  return BILLING_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
