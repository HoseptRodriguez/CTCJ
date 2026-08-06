import { AppointmentNotFound } from '../errors/AppointmentNotFound.js';

/**
 * @param {{
 *   appointmentRepository: import('../ports/AppointmentRepository.js').AppointmentRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createMarkCompleted({ appointmentRepository, clock }) {
  /** @param {{ appointmentId: string, resolvedByUserId: string }} input */
  return async function markCompleted({ appointmentId, resolvedByUserId }) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new AppointmentNotFound();
    }

    appointment.markCompleted({ resolvedBy: resolvedByUserId, now: clock.now() }); // throws InvalidAppointmentState

    return appointmentRepository.update(appointment);
  };
}
