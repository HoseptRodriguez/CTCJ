/** Maps the backend's clinical error codes (see apps/backend's clinical errorMapping.js) to Spanish UI copy. */
const CLINICAL_ERROR_MESSAGES = {
  appointment_not_found: 'No se encontró la cita indicada.',
  player_not_eligible: 'Este usuario no tiene el rol Jugador.',
  practitioner_not_eligible: 'Este usuario no tiene un rol clínico (Psicólogo o Neuropsicólogo).',
  practitioner_time_conflict:
    'Este profesional ya tiene una cita programada que se cruza con este horario.',
  invalid_appointment_state: 'Esta acción no está disponible en el estado actual de la cita.',
};

export function describeClinicalError(err) {
  return CLINICAL_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
