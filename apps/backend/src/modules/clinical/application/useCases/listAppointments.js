/**
 * Staff-facing scheduling list -- bare logistics only (who, when, status),
 * never note content. Enriches player/practitioner ids with names via
 * PlayerDirectoryProvider (works for any user, not just JUGADOR).
 *
 * @param {{
 *   appointmentRepository: import('../ports/AppointmentRepository.js').AppointmentRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 * }} deps
 */
export function createListAppointments({ appointmentRepository, playerDirectoryProvider }) {
  /** @param {{ playerId?: string, practitionerId?: string }} input */
  return async function listAppointments({ playerId, practitionerId } = {}) {
    const appointments = await appointmentRepository.list({ playerId, practitionerId });

    const allIds = [...new Set(appointments.flatMap((a) => [a.playerId, a.practitionerId]))];
    const summaries = await playerDirectoryProvider.getPlayerSummaries(allIds);

    return appointments.map((appointment) => ({
      ...appointment,
      playerName: summaries.get(appointment.playerId)
        ? `${summaries.get(appointment.playerId).firstName} ${summaries.get(appointment.playerId).lastName}`
        : null,
      practitionerName: summaries.get(appointment.practitionerId)
        ? `${summaries.get(appointment.practitionerId).firstName} ${summaries.get(appointment.practitionerId).lastName}`
        : null,
    }));
  };
}
