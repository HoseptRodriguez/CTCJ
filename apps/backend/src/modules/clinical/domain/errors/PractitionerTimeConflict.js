import { DomainError } from './DomainError.js';

/** Thrown when scheduling would overlap another SCHEDULED appointment for
 * the same practitioner -- the clean translation of the DB's exclusion
 * constraint violation (SQLSTATE 23P01), mirroring booking's
 * SlotNotAvailable translation of the same mechanism. */
export class PractitionerTimeConflict extends DomainError {
  constructor() {
    super(
      'practitioner_time_conflict',
      'This practitioner already has a scheduled appointment that overlaps this time.',
    );
  }
}
