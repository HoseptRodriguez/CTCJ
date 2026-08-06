import { DisciplineMismatch } from '../errors/DisciplineMismatch.js';
import { PractitionerNotEligible } from '../errors/PractitionerNotEligible.js';

/**
 * Staff-facing: a Fisioterapeuta's view of a player's recovery plans.
 * Physiotherapy-only, verified server-side independently of route gating.
 *
 * @param {{
 *   recoveryPlanRepository: import('../ports/RecoveryPlanRepository.js').RecoveryPlanRepository,
 *   practitionerEligibilityProvider: import('../ports/PractitionerEligibilityProvider.js').PractitionerEligibilityProvider,
 * }} deps
 */
export function createListRecoveryPlans({
  recoveryPlanRepository,
  practitionerEligibilityProvider,
}) {
  /** @param {{ playerId: string, practitionerUserId: string }} input */
  return async function listRecoveryPlans({ playerId, practitionerUserId }) {
    const { eligible, discipline } =
      await practitionerEligibilityProvider.getPractitionerEligibility(practitionerUserId);
    if (!eligible) {
      throw new PractitionerNotEligible();
    }
    if (discipline !== 'PHYSIOTHERAPY') {
      throw new DisciplineMismatch('PHYSIOTHERAPY');
    }

    const plans = await recoveryPlanRepository.listByPlayer(playerId);
    return { plans };
  };
}
