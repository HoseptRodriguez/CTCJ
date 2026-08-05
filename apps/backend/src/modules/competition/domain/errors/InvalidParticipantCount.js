import { DomainError } from './DomainError.js';

/** Thrown by CompetitionMatch.record() when a side doesn't have the exact
 * participant count its modality requires (1 for SINGLES, 2 for DOBLES). */
export class InvalidParticipantCount extends DomainError {
  constructor(modality, sideACount, sideBCount) {
    super(
      'invalid_participant_count',
      `${modality} matches require the correct number of participants per side (got A=${sideACount}, B=${sideBCount}).`,
    );
    this.modality = modality;
    this.sideACount = sideACount;
    this.sideBCount = sideBCount;
  }
}
