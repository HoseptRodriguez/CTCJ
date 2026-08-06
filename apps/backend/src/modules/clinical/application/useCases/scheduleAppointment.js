import { randomUUID } from 'node:crypto';

import { ClinicalAppointment } from '../../domain/entities/ClinicalAppointment.js';
import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';
import { PractitionerNotEligible } from '../errors/PractitionerNotEligible.js';

/**
 * @param {{
 *   appointmentRepository: import('../ports/AppointmentRepository.js').AppointmentRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 *   practitionerEligibilityProvider: import('../ports/PractitionerEligibilityProvider.js').PractitionerEligibilityProvider,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 * }} deps
 */
export function createScheduleAppointment({
  appointmentRepository,
  playerEligibilityProvider,
  practitionerEligibilityProvider,
  clock,
  clubId,
}) {
  /** @param {{ playerId: string, practitionerId: string, periodStart: Date, periodEnd: Date, scheduledByUserId: string }} input */
  return async function scheduleAppointment({
    playerId,
    practitionerId,
    periodStart,
    periodEnd,
    scheduledByUserId,
  }) {
    const isPlayerEligible = await playerEligibilityProvider.isEligiblePlayer(playerId);
    if (!isPlayerEligible) {
      throw new PlayerNotEligible();
    }
    const { eligible, discipline } =
      await practitionerEligibilityProvider.getPractitionerEligibility(practitionerId);
    if (!eligible) {
      throw new PractitionerNotEligible();
    }

    const appointment = ClinicalAppointment.schedule({
      id: randomUUID(),
      clubId,
      playerId,
      practitionerId,
      discipline,
      periodStart,
      periodEnd,
      scheduledBy: scheduledByUserId,
      now: clock.now(),
    });

    // PractitionerTimeConflict is thrown by the repository, translated from
    // the DB's exclusion-constraint violation (SQLSTATE 23P01) -- an
    // optimistic insert-and-catch, not check-then-insert, matching
    // booking's createHold precedent exactly.
    return appointmentRepository.create(appointment);
  };
}
