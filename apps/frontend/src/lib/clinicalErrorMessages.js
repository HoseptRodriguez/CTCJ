/** Maps the backend's clinical error codes (see apps/backend's clinical errorMapping.js) to Spanish UI copy. */
const CLINICAL_ERROR_MESSAGES = {
  appointment_not_found: 'No se encontró la cita indicada.',
  player_not_eligible: 'Este usuario no tiene el rol Jugador.',
  practitioner_not_eligible:
    'Este usuario no tiene un rol clínico (Psicólogo, Neuropsicólogo o Fisioterapeuta).',
  practitioner_time_conflict:
    'Este profesional ya tiene una cita programada que se cruza con este horario.',
  invalid_appointment_state: 'Esta acción no está disponible en el estado actual de la cita.',
  recovery_plan_not_found: 'No se encontró el plan de recuperación indicado.',
  invalid_recovery_plan_state: 'Esta acción no está disponible en el estado actual del plan.',
  medical_history_entry_not_found: 'No se encontró el registro de historial médico indicado.',
  invalid_medical_history_entry_state:
    'Esta acción no está disponible en el estado actual del registro.',
  discipline_mismatch: 'Esta acción solo está disponible para Fisioterapeutas.',
};

export function describeClinicalError(err) {
  return CLINICAL_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
