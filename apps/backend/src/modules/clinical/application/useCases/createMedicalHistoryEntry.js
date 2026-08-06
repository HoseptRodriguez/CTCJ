import { randomUUID } from 'node:crypto';

import { MedicalHistoryEntry } from '../../domain/entities/MedicalHistoryEntry.js';
import { DisciplineMismatch } from '../errors/DisciplineMismatch.js';
import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';
import { PractitionerNotEligible } from '../errors/PractitionerNotEligible.js';

/**
 * Medical history is a Physiotherapy-only concept -- a Psicologo/
 * Neuropsicologo is a legitimate clinical practitioner but is not eligible
 * to create an entry, enforced here independently of route-level gating.
 *
 * @param {{
 *   medicalHistoryRepository: import('../ports/MedicalHistoryRepository.js').MedicalHistoryRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 *   practitionerEligibilityProvider: import('../ports/PractitionerEligibilityProvider.js').PractitionerEligibilityProvider,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCreateMedicalHistoryEntry({
  medicalHistoryRepository,
  playerEligibilityProvider,
  practitionerEligibilityProvider,
  clock,
}) {
  /**
   * @param {{ playerId: string, condition: string, description?: string|null, visibility: string,
   *   occurredAt?: Date|null, practitionerUserId: string }} input
   */
  return async function createMedicalHistoryEntry({
    playerId,
    condition,
    description = null,
    visibility,
    occurredAt = null,
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

    const entry = MedicalHistoryEntry.create({
      id: randomUUID(),
      playerId,
      practitionerId: practitionerUserId,
      condition,
      description,
      visibility,
      occurredAt,
      now: clock.now(),
    });

    return medicalHistoryRepository.create(entry);
  };
}
