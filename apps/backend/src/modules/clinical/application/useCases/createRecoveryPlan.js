import { randomUUID } from 'node:crypto';

import { RecoveryPlan } from '../../domain/entities/RecoveryPlan.js';
import { DisciplineMismatch } from '../errors/DisciplineMismatch.js';
import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';
import { PractitionerNotEligible } from '../errors/PractitionerNotEligible.js';

/**
 * Recovery plans are a Physiotherapy-only concept -- a Psicologo/
 * Neuropsicologo is a legitimate clinical practitioner but is not eligible
 * to create one, enforced here independently of route-level gating.
 *
 * @param {{
 *   recoveryPlanRepository: import('../ports/RecoveryPlanRepository.js').RecoveryPlanRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 *   practitionerEligibilityProvider: import('../ports/PractitionerEligibilityProvider.js').PractitionerEligibilityProvider,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCreateRecoveryPlan({
  recoveryPlanRepository,
  playerEligibilityProvider,
  practitionerEligibilityProvider,
  clock,
}) {
  /**
   * @param {{ playerId: string, title: string, goal?: string|null, visibility: string,
   *   practitionerUserId: string }} input
   */
  return async function createRecoveryPlan({
    playerId,
    title,
    goal = null,
    visibility,
    practitionerUserId,
  }) {
    const isPlayerEligible = await playerEligibilityProvider.isEligiblePlayer(playerId);
    if (!isPlayerEligible) {
      throw new PlayerNotEligible();
    }
    const { eligible, discipline } =
      await practitionerEligibilityProvider.getPractitionerEligibility(practitionerUserId);
    if (!eligible) {
      throw new PractitionerNotEligible();
    }
    if (discipline !== 'PHYSIOTHERAPY') {
      throw new DisciplineMismatch('PHYSIOTHERAPY');
    }

    const plan = RecoveryPlan.create({
      id: randomUUID(),
      playerId,
      practitionerId: practitionerUserId,
      title,
      goal,
      visibility,
      now: clock.now(),
    });

    return recoveryPlanRepository.create(plan);
  };
}
