import { describe, expect, it } from 'vitest';

import { ChallengeMatchResult } from '../../../../src/modules/challenges/domain/entities/ChallengeMatchResult.js';
import { InvalidScoreSubmission } from '../../../../src/modules/challenges/domain/errors/InvalidScoreSubmission.js';
import { InvalidMatchResultState } from '../../../../src/modules/challenges/domain/errors/InvalidMatchResultState.js';

const NOW = new Date('2026-08-15T10:00:00Z');

function buildResult() {
  return ChallengeMatchResult.start({ id: 'result-1', challengeId: 'challenge-1', now: NOW });
}

const challengerSubmission = {
  side: 'CHALLENGER',
  category: 'CUARTA',
  setsWonA: 2,
  setsWonB: 0,
  playedAt: new Date('2026-08-14'),
  now: NOW,
};

const agreeingOpponentSubmission = {
  side: 'OPPONENT',
  category: 'CUARTA',
  setsWonA: 2,
  setsWonB: 0,
  playedAt: new Date('2026-08-14'),
  now: NOW,
};

describe('ChallengeMatchResult state machine', () => {
  it('starts PENDING with no submissions', () => {
    const result = buildResult();
    expect(result.status).toBe('PENDING');
    expect(result.isFullySubmitted()).toBe(false);
  });

  it("submit() from one side stores only that side's submission", () => {
    const result = buildResult();
    result.submit(challengerSubmission);
    expect(result.challengerSubmission).toMatchObject({
      category: 'CUARTA',
      setsWonA: 2,
      setsWonB: 0,
    });
    expect(result.opponentSubmission).toBeNull();
    expect(result.isFullySubmitted()).toBe(false);
  });

  it('rejects a tied score', () => {
    const result = buildResult();
    expect(() => result.submit({ ...challengerSubmission, setsWonA: 1, setsWonB: 1 })).toThrow(
      InvalidScoreSubmission,
    );
  });

  it('submissionsAgree() is true when both submissions match exactly', () => {
    const result = buildResult();
    result.submit(challengerSubmission);
    result.submit(agreeingOpponentSubmission);
    expect(result.isFullySubmitted()).toBe(true);
    expect(result.submissionsAgree()).toBe(true);
  });

  it('submissionsAgree() is false on a mismatched score', () => {
    const result = buildResult();
    result.submit(challengerSubmission);
    result.submit({ ...agreeingOpponentSubmission, setsWonA: 0, setsWonB: 2 });
    expect(result.submissionsAgree()).toBe(false);
  });

  it('submissionsAgree() is false on a mismatched category or date', () => {
    const byCategory = buildResult();
    byCategory.submit(challengerSubmission);
    byCategory.submit({ ...agreeingOpponentSubmission, category: 'TERCERA' });
    expect(byCategory.submissionsAgree()).toBe(false);

    const byDate = buildResult();
    byDate.submit(challengerSubmission);
    byDate.submit({ ...agreeingOpponentSubmission, playedAt: new Date('2026-08-15') });
    expect(byDate.submissionsAgree()).toBe(false);
  });

  it('a later submit() from the same side overwrites their prior submission (resubmission)', () => {
    const result = buildResult();
    result.submit(challengerSubmission);
    result.submit({ ...challengerSubmission, setsWonA: 0, setsWonB: 2 });
    expect(result.challengerSubmission).toMatchObject({ setsWonA: 0, setsWonB: 2 });
  });

  it('confirm() transitions PENDING -> CONFIRMED once agreeing, stamping competitionMatchId/confirmedAt', () => {
    const result = buildResult();
    result.submit(challengerSubmission);
    result.submit(agreeingOpponentSubmission);
    const confirmedAt = new Date('2026-08-16T10:00:00Z');

    result.confirm({ competitionMatchId: 'match-1', now: confirmedAt });

    expect(result.status).toBe('CONFIRMED');
    expect(result.competitionMatchId).toBe('match-1');
    expect(result.confirmedAt).toBe(confirmedAt);
  });

  it('rejects confirm() when not fully submitted', () => {
    const result = buildResult();
    result.submit(challengerSubmission);
    expect(() => result.confirm({ competitionMatchId: 'match-1', now: NOW })).toThrow(
      InvalidMatchResultState,
    );
  });

  it('rejects confirm() when submissions mismatch', () => {
    const result = buildResult();
    result.submit(challengerSubmission);
    result.submit({ ...agreeingOpponentSubmission, setsWonA: 0, setsWonB: 2 });
    expect(() => result.confirm({ competitionMatchId: 'match-1', now: NOW })).toThrow(
      InvalidMatchResultState,
    );
  });

  it('rejects submit() once CONFIRMED', () => {
    const result = buildResult();
    result.submit(challengerSubmission);
    result.submit(agreeingOpponentSubmission);
    result.confirm({ competitionMatchId: 'match-1', now: NOW });

    expect(() => result.submit(challengerSubmission)).toThrow(InvalidMatchResultState);
  });
});
