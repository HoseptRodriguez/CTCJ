import { DomainError } from './DomainError.js';

/** Thrown by ChallengeMatchResult.submit() when the submitted score ties --
 * mirrors competition's InvalidWinnerSide's role (a tie can't map to a
 * winner side once this gets recorded into competition_matches). */
export class InvalidScoreSubmission extends DomainError {
  constructor(setsWonA, setsWonB) {
    super(
      'invalid_score_submission',
      `A submitted score cannot tie (got ${setsWonA}-${setsWonB}).`,
    );
    this.setsWonA = setsWonA;
    this.setsWonB = setsWonB;
  }
}
