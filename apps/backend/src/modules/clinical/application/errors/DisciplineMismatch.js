import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown when a practitioner attempts an action reserved for a different
 * discipline -- e.g. a Psicologo/Neuropsicologo attempting to create a
 * recovery plan or medical history entry, which are Physiotherapy-only
 * concepts. */
export class DisciplineMismatch extends DomainError {
  constructor(requiredDiscipline) {
    super('discipline_mismatch', `This action requires a ${requiredDiscipline} practitioner.`);
    this.requiredDiscipline = requiredDiscipline;
  }
}
