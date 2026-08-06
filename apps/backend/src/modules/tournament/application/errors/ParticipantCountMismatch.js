import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by addParticipant when the member count doesn't match the
 * tournament's modality (1 for SINGLES, 2 for DOBLES). */
export class ParticipantCountMismatch extends DomainError {
  constructor(modality, count) {
    super(
      'participant_count_mismatch',
      `${modality} entries require the correct number of players (got ${count}).`,
    );
    this.modality = modality;
    this.count = count;
  }
}
