/**
 * Self-service: the caller's own appointments, scoped server-side to
 * playerId (never client-supplied), matching the self-service split
 * convention (listAppointments vs getMyAppointments, staff sees everything
 * vs self scoped to req.user.id).
 *
 * @param {{
 *   appointmentRepository: import('../ports/AppointmentRepository.js').AppointmentRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 * }} deps
 */
export function createGetMyAppointments({ appointmentRepository, playerDirectoryProvider }) {
  /** @param {{ playerId: string }} input */
  return async function getMyAppointments({ playerId }) {
    const appointments = await appointmentRepository.list({ playerId });

    const practitionerIds = [...new Set(appointments.map((a) => a.practitionerId))];
    const summaries = await playerDirectoryProvider.getPlayerSummaries(practitionerIds);

    return appointments.map((appointment) => ({
      ...appointment,
      practitionerName: summaries.get(appointment.practitionerId)
        ? `${summaries.get(appointment.practitionerId).firstName} ${summaries.get(appointment.practitionerId).lastName}`
        : null,
    }));
  };
}
