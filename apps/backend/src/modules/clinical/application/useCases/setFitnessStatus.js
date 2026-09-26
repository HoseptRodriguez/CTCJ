import { FITNESS_STATUS } from '@ctcj/shared';

import { DisciplineMismatch } from '../errors/DisciplineMismatch.js';
import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';
import { PractitionerNotEligible } from '../errors/PractitionerNotEligible.js';

/**
 * A Fisioterapeuta marks a player "Apto" or "No apto para jugar hasta
 * [fecha]". Physiotherapy-only, checked here independently of the route.
 *
 * @param {{
 *   fitnessStatusRepository: import('../ports/FitnessStatusRepository.js').FitnessStatusRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 *   practitionerEligibilityProvider: import('../ports/PractitionerEligibilityProvider.js').PractitionerEligibilityProvider,
 * }} deps
 */
export function createSetFitnessStatus({
  fitnessStatusRepository,
  playerEligibilityProvider,
  practitionerEligibilityProvider,
}) {
  /**
   * @param {{ playerId: string, practitionerUserId: string, status: string, unfitUntil?: string }} input
   *   unfitUntil: "YYYY-MM-DD", only for UNFIT (omitted = until further notice)
   */
  return async function setFitnessStatus({ playerId, practitionerUserId, status, unfitUntil }) {
    if (!(await playerEligibilityProvider.isEligiblePlayer(playerId))) {
      throw new PlayerNotEligible();
    }
    const { eligible, discipline } =
      await practitionerEligibilityProvider.getPractitionerEligibility(practitionerUserId);
    if (!eligible) {
      throw new PractitionerNotEligible();
    }
    if (discipline !== 'PHYSIOTHERAPY') {
      throw new DisciplineMismatch();
    }

    const saved = await fitnessStatusRepository.record({
      playerId,
      practitionerId: practitionerUserId,
      status,
      unfitUntil:
        status === FITNESS_STATUS.UNFIT && unfitUntil ? new Date(`${unfitUntil}T00:00:00Z`) : null,
    });
    return {
      status: saved.status,
      unfitUntil: saved.unfitUntil ? new Date(saved.unfitUntil).toISOString().slice(0, 10) : null,
      recordedAt: saved.createdAt,
    };
  };
}
