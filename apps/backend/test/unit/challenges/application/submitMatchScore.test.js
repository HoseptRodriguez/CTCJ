import { beforeEach, describe, expect, it } from 'vitest';

import { createSubmitMatchScore } from '../../../../src/modules/challenges/application/useCases/submitMatchScore.js';
import { ChallengeNotFound } from '../../../../src/modules/challenges/application/errors/ChallengeNotFound.js';
import { ChallengeNotAccepted } from '../../../../src/modules/challenges/application/errors/ChallengeNotAccepted.js';
import { Challenge } from '../../../../src/modules/challenges/domain/entities/Challenge.js';

import {
  createFakeChallengeRepository,
  createFakeChallengeMatchResultRepository,
  createFakeMatchRecorder,
  createFakeNotificationSender,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-08-15T10:00:00Z');

async function seedAcceptedChallenge(challengeRepository) {
  const challenge = Challenge.create({
    id: 'challenge-1',
    challengerUserId: 'player-1',
    opponentUserId: 'player-2',
    now: NOW,
  });
  challenge.accept(NOW);
  await challengeRepository.create(challenge);
  return challenge;
}

function buildDeps(overrides = {}) {
  return {
    challengeRepository: createFakeChallengeRepository(),
    challengeMatchResultRepository: createFakeChallengeMatchResultRepository(),
    matchRecorder: createFakeMatchRecorder(),
    notificationSender: createFakeNotificationSender(),
    clock: createFakeClock(NOW),
    ...overrides,
  };
}

const baseInput = {
  challengeId: 'challenge-1',
  category: 'CUARTA',
  playedAt: new Date('2026-08-14'),
};

describe('submitMatchScore', () => {
  let deps;

  beforeEach(() => {
    deps = buildDeps();
  });

  it('throws ChallengeNotFound for an unknown challenge', async () => {
    const submitMatchScore = createSubmitMatchScore(deps);
    await expect(
      submitMatchScore({ ...baseInput, userId: 'player-1', mySetsWon: 2, opponentSetsWon: 0 }),
    ).rejects.toThrow(ChallengeNotFound);
  });

  it('throws ChallengeNotFound when the caller is not a participant', async () => {
    await seedAcceptedChallenge(deps.challengeRepository);
    const submitMatchScore = createSubmitMatchScore(deps);
    await expect(
      submitMatchScore({ ...baseInput, userId: 'someone-else', mySetsWon: 2, opponentSetsWon: 0 }),
    ).rejects.toThrow(ChallengeNotFound);
  });

  it('throws ChallengeNotAccepted for a still-PENDING challenge', async () => {
    const challenge = Challenge.create({
      id: 'challenge-1',
      challengerUserId: 'player-1',
      opponentUserId: 'player-2',
      now: NOW,
    });
    await deps.challengeRepository.create(challenge);
    const submitMatchScore = createSubmitMatchScore(deps);
    await expect(
      submitMatchScore({ ...baseInput, userId: 'player-1', mySetsWon: 2, opponentSetsWon: 0 }),
    ).rejects.toThrow(ChallengeNotAccepted);
  });

  it('first submission: persists PENDING, notifies the other player, records nothing yet', async () => {
    await seedAcceptedChallenge(deps.challengeRepository);
    const submitMatchScore = createSubmitMatchScore(deps);

    const result = await submitMatchScore({
      ...baseInput,
      userId: 'player-1',
      mySetsWon: 2,
      opponentSetsWon: 0,
    });

    expect(result.status).toBe('PENDING');
    expect(deps.matchRecorder.recorded).toHaveLength(0);
    expect(deps.notificationSender.sent).toHaveLength(1);
    expect(deps.notificationSender.sent[0]).toMatchObject({
      recipientId: 'player-2',
      type: 'CHALLENGE_RESULT_SUBMITTED',
    });
  });

  it('agreeing second submission: confirms, records a competition match, completes the challenge', async () => {
    await seedAcceptedChallenge(deps.challengeRepository);
    const submitMatchScore = createSubmitMatchScore(deps);

    await submitMatchScore({
      ...baseInput,
      userId: 'player-1',
      mySetsWon: 2,
      opponentSetsWon: 0,
    });
    const result = await submitMatchScore({
      ...baseInput,
      userId: 'player-2',
      mySetsWon: 0,
      opponentSetsWon: 2,
    });

    expect(result.status).toBe('CONFIRMED');
    expect(deps.matchRecorder.recorded).toHaveLength(1);
    expect(deps.matchRecorder.recorded[0]).toMatchObject({
      participantsA: ['player-1'],
      participantsB: ['player-2'],
      winnerSide: 'A',
      setsWonA: 2,
      setsWonB: 0,
      recordedByUserId: 'player-2',
    });

    const challenge = await deps.challengeRepository.findById('challenge-1');
    expect(challenge.status).toBe('COMPLETED');

    const confirmedNotification = deps.notificationSender.sent.find(
      (n) => n.type === 'CHALLENGE_RESULT_CONFIRMED',
    );
    expect(confirmedNotification).toMatchObject({ recipientId: 'player-1' });
  });

  it('mismatched second submission: stays PENDING, notifies the other player of the mismatch', async () => {
    await seedAcceptedChallenge(deps.challengeRepository);
    const submitMatchScore = createSubmitMatchScore(deps);

    await submitMatchScore({
      ...baseInput,
      userId: 'player-1',
      mySetsWon: 2,
      opponentSetsWon: 0,
    });
    const result = await submitMatchScore({
      ...baseInput,
      userId: 'player-2',
      mySetsWon: 2,
      opponentSetsWon: 0, // player-2 also claims to have won 2-0 -- disagrees with player-1's account
    });

    expect(result.status).toBe('PENDING');
    expect(deps.matchRecorder.recorded).toHaveLength(0);
    const mismatchNotification = deps.notificationSender.sent.find(
      (n) => n.type === 'CHALLENGE_RESULT_MISMATCH',
    );
    expect(mismatchNotification).toMatchObject({ recipientId: 'player-1' });

    const challenge = await deps.challengeRepository.findById('challenge-1');
    expect(challenge.status).toBe('ACCEPTED');
  });

  it('resubmitting after a mismatch can resolve it and confirm', async () => {
    await seedAcceptedChallenge(deps.challengeRepository);
    const submitMatchScore = createSubmitMatchScore(deps);

    await submitMatchScore({ ...baseInput, userId: 'player-1', mySetsWon: 2, opponentSetsWon: 0 });
    await submitMatchScore({ ...baseInput, userId: 'player-2', mySetsWon: 2, opponentSetsWon: 0 });
    const result = await submitMatchScore({
      ...baseInput,
      userId: 'player-2',
      mySetsWon: 0,
      opponentSetsWon: 2,
    });

    expect(result.status).toBe('CONFIRMED');
    expect(deps.matchRecorder.recorded).toHaveLength(1);
  });

  it('propagates whatever error matchRecorder throws on the confirming submission unchanged', async () => {
    // Translating competition-specific error codes into challenges' own
    // error classes is matchRecorderAdapter.js's job (tested there) -- at
    // this level, submitMatchScore just calls the port and lets it throw.
    await seedAcceptedChallenge(deps.challengeRepository);
    class SomeMatchRecorderError extends Error {}
    deps.matchRecorder = createFakeMatchRecorder({ shouldThrow: new SomeMatchRecorderError() });
    const submitMatchScore = createSubmitMatchScore(deps);

    await submitMatchScore({ ...baseInput, userId: 'player-1', mySetsWon: 2, opponentSetsWon: 0 });
    await expect(
      submitMatchScore({ ...baseInput, userId: 'player-2', mySetsWon: 0, opponentSetsWon: 2 }),
    ).rejects.toThrow(SomeMatchRecorderError);
  });
});
