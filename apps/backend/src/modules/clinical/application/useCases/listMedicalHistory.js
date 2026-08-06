import { DisciplineMismatch } from '../errors/DisciplineMismatch.js';
import { PractitionerNotEligible } from '../errors/PractitionerNotEligible.js';

/**
 * Staff-facing: a Fisioterapeuta's view of a player's medical history.
 * Physiotherapy-only, verified server-side independently of route gating.
 *
 * @param {{
 *   medicalHistoryRepository: import('../ports/MedicalHistoryRepository.js').MedicalHistoryRepository,
 *   practitionerEligibilityProvider: import('../ports/PractitionerEligibilityProvider.js').PractitionerEligibilityProvider,
 * }} deps
 */
export function createListMedicalHistory({
  medicalHistoryRepository,
  practitionerEligibilityProvider,
}) {
  /** @param {{ playerId: string, practitionerUserId: string }} input */
  return async function listMedicalHistory({ playerId, practitionerUserId }) {
    const { eligible, discipline } =
      await practitionerEligibilityProvider.getPractitionerEligibility(practitionerUserId);
    if (!eligible) {
      throw new PractitionerNotEligible();
    }
    if (discipline !== 'PHYSIOTHERAPY') {
      throw new DisciplineMismatch('PHYSIOTHERAPY');
    }

    const entries = await medicalHistoryRepository.listByPlayer(playerId);
    return { entries };
  };
}
