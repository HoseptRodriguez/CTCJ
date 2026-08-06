import { PractitionerNotEligible } from '../errors/PractitionerNotEligible.js';

/**
 * Discipline-siloed: a Psicologo/Neuropsicologo only ever sees Psychology
 * notes, a Fisioterapeuta only ever sees Physiotherapy notes -- the
 * requesting practitioner's discipline is resolved server-side, never
 * client-supplied, so there is no way to ask for another discipline's
 * content by passing a different parameter.
 *
 * @param {{
 *   noteRepository: import('../ports/NoteRepository.js').NoteRepository,
 *   practitionerEligibilityProvider: import('../ports/PractitionerEligibilityProvider.js').PractitionerEligibilityProvider,
 * }} deps
 */
export function createListPlayerNotes({ noteRepository, practitionerEligibilityProvider }) {
  /** @param {{ playerId: string, practitionerUserId: string }} input */
  return async function listPlayerNotes({ playerId, practitionerUserId }) {
    const { eligible, discipline } =
      await practitionerEligibilityProvider.getPractitionerEligibility(practitionerUserId);
    if (!eligible) {
      throw new PractitionerNotEligible();
    }

    const notes = await noteRepository.listByPlayer(playerId, { discipline });
    return { notes };
  };
}
