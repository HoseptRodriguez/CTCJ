import { AppointmentNotFound } from '../errors/AppointmentNotFound.js';

/**
 * @param {{
 *   appointmentRepository: import('../ports/AppointmentRepository.js').AppointmentRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCancelAppointment({ appointmentRepository, clock }) {
  /** @param {{ appointmentId: string, reason: string, cancelledByUserId: string }} input */
  return async function cancelAppointment({ appointmentId, reason, cancelledByUserId }) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new AppointmentNotFound();
    }

    appointment.cancel({ reason, cancelledBy: cancelledByUserId, now: clock.now() }); // throws InvalidAppointmentState

    return appointmentRepository.update(appointment);
  };
}
