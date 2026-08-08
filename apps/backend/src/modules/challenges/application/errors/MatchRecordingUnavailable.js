import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown when matchRecorder.recordConfirmedMatch can't complete because
 * competition has no open season -- translated by matchRecorderAdapter.js
 * from competition's own NoOpenSeason error (no foreign DomainError
 * subclass crosses the module boundary). */
export class MatchRecordingUnavailable extends DomainError {
  constructor() {
    super(
      'match_recording_unavailable',
      'There is no open competition season right now, so this result cannot be confirmed.',
    );
  }
}
