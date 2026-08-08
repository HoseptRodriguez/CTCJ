import { InvalidScoreSubmission } from '../errors/InvalidScoreSubmission.js';
import { InvalidMatchResultState } from '../errors/InvalidMatchResultState.js';

// Defined locally, not in packages/shared -- mirrors CompetitionMatch's own
// MATCH_STATUS precedent (a status enum private to one entity doesn't need
// to be shared).
export const MATCH_RESULT_STATUS = Object.freeze({ PENDING: 'PENDING', CONFIRMED: 'CONFIRMED' });

/**
 * Two players self-reporting a score for the same ACCEPTED challenge --
 * confirmed only once both submissions agree. Framework-agnostic by
 * construction: no Express/Prisma imports anywhere in this file (enforced
 * mechanically by .dependency-cruiser.js).
 *
 * Both submissions are stored in the SAME fixed frame CompetitionMatch
 * itself uses: setsWonA/setsWonB always mean A=challenger, B=opponent,
 * regardless of which of the two players is submitting -- the use case
 * (submitMatchScore.js) is responsible for translating "my sets/their
 * sets" into this frame before calling submit(). That keeps
 * submissionsAgree() a straight field comparison, not a role-aware one.
 */
export class ChallengeMatchResult {
  constructor({
    id,
    challengeId,
    status = MATCH_RESULT_STATUS.PENDING,
    challengerSubmission = null,
    opponentSubmission = null,
    competitionMatchId = null,
    confirmedAt = null,
    createdAt = null,
  }) {
    this.id = id;
    this.challengeId = challengeId;
    this.status = status;
    // Each submission, when present: { category, setsWonA, setsWonB, playedAt, submittedAt }
    this.challengerSubmission = challengerSubmission;
    this.opponentSubmission = opponentSubmission;
    this.competitionMatchId = competitionMatchId;
    this.confirmedAt = confirmedAt;
    this.createdAt = createdAt;
  }

  static start({ id, challengeId, now }) {
    return new ChallengeMatchResult({ id, challengeId, createdAt: now });
  }

  /**
   * @param {{ side: 'CHALLENGER'|'OPPONENT', category: string, setsWonA: number,
   *   setsWonB: number, playedAt: Date, now: Date }} input
   */
  submit({ side, category, setsWonA, setsWonB, playedAt, now }) {
    if (this.status !== MATCH_RESULT_STATUS.PENDING) {
      throw new InvalidMatchResultState(this.status, 'submit');
    }
    if (setsWonA === setsWonB) {
      throw new InvalidScoreSubmission(setsWonA, setsWonB);
    }
    const submission = { category, setsWonA, setsWonB, playedAt, submittedAt: now };
    if (side === 'CHALLENGER') {
      this.challengerSubmission = submission;
    } else {
      this.opponentSubmission = submission;
    }
  }

  isFullySubmitted() {
    return this.challengerSubmission !== null && this.opponentSubmission !== null;
  }

  /** Compares both submissions field-by-field -- category, both set
   * counts, and playedAt (date-only, ignoring time-of-day). False if
   * either submission is still missing. */
  submissionsAgree() {
    if (!this.isFullySubmitted()) {
      return false;
    }
    const a = this.challengerSubmission;
    const b = this.opponentSubmission;
    return (
      a.category === b.category &&
      a.setsWonA === b.setsWonA &&
      a.setsWonB === b.setsWonB &&
      datePart(a.playedAt) === datePart(b.playedAt)
    );
  }

  /** Legal only when fully submitted and agreeing -- a defensive guard,
   * not the primary check (submitMatchScore.js checks isFullySubmitted()
   * + submissionsAgree() itself before ever calling this), matching
   * CompetitionMatch.record()'s own belt-and-suspenders validation style. */
  confirm({ competitionMatchId, now }) {
    if (this.status !== MATCH_RESULT_STATUS.PENDING) {
      throw new InvalidMatchResultState(this.status, 'confirm');
    }
    if (!this.submissionsAgree()) {
      throw new InvalidMatchResultState(this.status, 'confirm');
    }
    this.status = MATCH_RESULT_STATUS.CONFIRMED;
    this.competitionMatchId = competitionMatchId;
    this.confirmedAt = now;
  }
}

function datePart(date) {
  return date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10);
}
