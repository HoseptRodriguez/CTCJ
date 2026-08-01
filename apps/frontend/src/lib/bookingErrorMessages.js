/** Maps the backend's booking error codes (see apps/backend's errorMapping.js) to Spanish UI copy. */
const BOOKING_ERROR_MESSAGES = {
  invalid_time_slot: 'El horario seleccionado no es valido.',
  slot_not_available: 'Ese horario ya fue reservado. Elige otro.',
  hold_expired: 'Tu reserva temporal expiro. Intenta de nuevo.',
  reservation_not_owned: 'No puedes modificar una reserva que no es tuya.',
  reservation_not_found: 'No se encontro esa reserva.',
  court_not_found: 'No se encontro esa cancha.',
  invalid_reservation_state: 'Esta reserva ya no se puede modificar.',
  max_concurrent_reservations_exceeded: 'Ya tienes el maximo de reservas activas permitidas.',
};

export function describeBookingError(err) {
  return BOOKING_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrio un error inesperado.';
}
