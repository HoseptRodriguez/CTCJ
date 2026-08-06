import { AppointmentNotFound } from '../errors/AppointmentNotFound.js';

/**
 * @param {{
 *   appointmentRepository: import('../ports/AppointmentRepository.js').AppointmentRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createMarkNoShow({ appointmentRepository, clock }) {
  /** @param {{ appointmentId: string, resolvedByUserId: string }} input */
  return async function markNoShow({ appointmentId, resolvedByUserId }) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new AppointmentNotFound();
    }

    appointment.markNoShow({ resolvedBy: resolvedByUserId, now: clock.now() }); // throws InvalidAppointmentState

    return appointmentRepository.update(appointment);
  };
}
