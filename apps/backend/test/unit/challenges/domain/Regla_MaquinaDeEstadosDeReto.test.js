import { describe, expect, it } from 'vitest';

import { Challenge } from '../../../../src/modules/challenges/domain/entities/Challenge.js';
import { InvalidChallengeState } from '../../../../src/modules/challenges/domain/errors/InvalidChallengeState.js';

const NOW = new Date('2026-08-13T10:00:00Z');

function buildPendingChallenge() {
  return Challenge.create({
    id: 'challenge-1',
    challengerUserId: 'player-1',
    opponentUserId: 'player-2',
    message: 'Quieres jugar el sábado?',
    now: NOW,
  });
}

describe('Challenge state machine', () => {
  it('starts PENDING with no respondedAt', () => {
    const challenge = buildPendingChallenge();
    expect(challenge.status).toBe('PENDING');
    expect(challenge.respondedAt).toBeNull();
  });

  it('accept() transitions PENDING -> ACCEPTED and stamps respondedAt', () => {
    const challenge = buildPendingChallenge();
    const respondedAt = new Date('2026-08-14T10:00:00Z');

    challenge.accept(respondedAt);

    expect(challenge.status).toBe('ACCEPTED');
    expect(challenge.respondedAt).toBe(respondedAt);
  });

  it('reject() transitions PENDING -> REJECTED', () => {
    const challenge = buildPendingChallenge();
    challenge.reject(NOW);
    expect(challenge.status).toBe('REJECTED');
  });

  it('cancel() transitions PENDING -> CANCELLED', () => {
    const challenge = buildPendingChallenge();
    challenge.cancel(NOW);
    expect(challenge.status).toBe('CANCELLED');
  });

  it.each(['accept', 'reject', 'cancel'])('rejects %s() from a terminal state', (action) => {
    const challenge = buildPendingChallenge();
    challenge.accept(NOW);

    expect(() => challenge[action](NOW)).toThrow(InvalidChallengeState);
  });
});
