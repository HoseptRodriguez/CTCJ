/**
 * Maps the backend's booking error codes (see apps/backend's errorMapping.js)
 * to Spanish copy that says what happened AND what to do next.
 */
const BOOKING_ERROR_MESSAGES = {
  invalid_time_slot:
    'Esa hora ya no se puede reservar: las reservas se hacen con al menos 30 minutos y máximo 7 días de anticipación. Elige otra hora.',
  slot_not_available: 'Alguien acaba de reservar esa hora. Elige otra hora libre.',
  hold_expired:
    'Se acabó el tiempo para confirmar y la hora quedó libre. Tócala de nuevo para reservarla.',
  reservation_not_owned: 'Esta reserva es de otra persona, no la puedes cambiar.',
  reservation_not_found: 'No encontramos esa reserva. Actualiza la página.',
  court_not_found: 'Esa cancha no está disponible. Elige otra.',
  invalid_reservation_state:
    'Esta reserva ya no se puede cambiar. Actualiza la página para ver su estado.',
  max_concurrent_reservations_exceeded:
    'Ya tienes 2 reservas activas, que es el máximo. Cuando pase una, podrás reservar otra.',
  reservation_already_paid: 'Esta reserva ya tiene un pago registrado.',
  reservation_has_no_price: 'Esta cancha todavía no tiene precio. Avisa en recepción.',
  membership_overdue_booking_blocked:
    'Tu membresía no permite reservar por ahora. Acércate a recepción para ponerte al día.',
  not_authorized_to_book_for_user: 'No tienes autorización para reservar en nombre de esa cuenta.',
};

export function describeBookingError(err) {
  if (err?.status === 429)
    return 'Hiciste demasiados intentos. Espera un momento e intenta de nuevo.';
  return (
    BOOKING_ERROR_MESSAGES[err?.code] ??
    'No pudimos completar la reserva. Revisa tu conexión e intenta de nuevo.'
  );
}
