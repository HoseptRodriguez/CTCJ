import { describe, expect, it } from 'vitest';

import { createGetMyChallenges } from '../../../../src/modules/challenges/application/useCases/getMyChallenges.js';
import { createCreateChallenge } from '../../../../src/modules/challenges/application/useCases/createChallenge.js';
import { createSubmitMatchScore } from '../../../../src/modules/challenges/application/useCases/submitMatchScore.js';
import { Challenge } from '../../../../src/modules/challenges/domain/entities/Challenge.js';

import {
  createFakeChallengeRepository,
  createFakePlayerEligibilityProvider,
  createFakePlayerDirectoryProvider,
  createFakeChallengeMatchResultRepository,
  createFakeMatchRecorder,
  createFakeNotificationSender,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-08-13T10:00:00Z');

function buildDeps() {
  return {
    challengeRepository: createFakeChallengeRepository(),
    playerEligibilityProvider: createFakePlayerEligibilityProvider(
      new Set(['player-1', 'player-2', 'player-3']),
    ),
    playerDirectoryProvider: createFakePlayerDirectoryProvider(
      new Map([
        ['player-1', { firstName: 'Ana', lastName: 'Gomez' }],
        ['player-2', { firstName: 'Luis', lastName: 'Perez' }],
        ['player-3', { firstName: 'Caro', lastName: 'Diaz' }],
      ]),
    ),
    challengeMatchResultRepository: createFakeChallengeMatchResultRepository(),
    matchRecorder: createFakeMatchRecorder(),
    notificationSender: createFakeNotificationSender(),
    clock: createFakeClock(NOW),
  };
}

describe('getMyChallenges', () => {
  it('returns an empty list when the player has no challenges', async () => {
    const deps = buildDeps();
    const getMyChallenges = createGetMyChallenges(deps);

    expect(await getMyChallenges({ userId: 'player-1' })).toEqual({ challenges: [] });
  });

  it("tags each challenge with the caller's role and the other party's name", async () => {
    const deps = buildDeps();
    const createChallenge = createCreateChallenge(deps);
    const getMyChallenges = createGetMyChallenges(deps);

    // player-1 challenges player-2 (player-1 is CHALLENGER here)
    await createChallenge({ challengerUserId: 'player-1', opponentUserId: 'player-2' });
    // player-3 challenges player-1 (player-1 is OPPONENT here)
    await createChallenge({ challengerUserId: 'player-3', opponentUserId: 'player-1' });

    const result = await getMyChallenges({ userId: 'player-1' });

    expect(result.challenges).toHaveLength(2);
    const asChallenger = result.challenges.find((c) => c.opponentUserId === 'player-2');
    const asOpponent = result.challenges.find((c) => c.challengerUserId === 'player-3');
    expect(asChallenger).toMatchObject({
      role: 'CHALLENGER',
      otherParty: { id: 'player-2', firstName: 'Luis', lastName: 'Perez' },
    });
    expect(asOpponent).toMatchObject({
      role: 'OPPONENT',
      otherParty: { id: 'player-3', firstName: 'Caro', lastName: 'Diaz' },
    });
  });

  it('matchResult is null for a PENDING challenge', async () => {
    const deps = buildDeps();
    const createChallenge = createCreateChallenge(deps);
    const getMyChallenges = createGetMyChallenges(deps);

    await createChallenge({ challengerUserId: 'player-1', opponentUserId: 'player-2' });
    const result = await getMyChallenges({ userId: 'player-1' });

    expect(result.challenges[0].matchResult).toBeNull();
  });

  it('matchResult reflects a single submission, translated to my/opponent naming for each caller', async () => {
    const deps = buildDeps();
    const challenge = Challenge.create({
      id: 'challenge-1',
      challengerUserId: 'player-1',
      opponentUserId: 'player-2',
      now: NOW,
    });
    challenge.accept(NOW);
    await deps.challengeRepository.create(challenge);

    const submitMatchScore = createSubmitMatchScore(deps);
    await submitMatchScore({
      userId: 'player-1',
      challengeId: 'challenge-1',
      category: 'CUARTA',
      mySetsWon: 2,
      opponentSetsWon: 0,
      playedAt: new Date('2026-08-14'),
    });

    const getMyChallenges = createGetMyChallenges(deps);

    const asChallenger = (await getMyChallenges({ userId: 'player-1' })).challenges[0];
    expect(asChallenger.matchResult).toMatchObject({
      status: 'PENDING',
      mySubmission: { mySetsWon: 2, opponentSetsWon: 0 },
      opponentSubmission: null,
      mismatch: false,
    });

    const asOpponent = (await getMyChallenges({ userId: 'player-2' })).challenges[0];
    expect(asOpponent.matchResult).toMatchObject({
      status: 'PENDING',
      mySubmission: null,
      // Same submission (challenger won 2-0), reframed relative to player-2:
      // their own sets (0) are "mine", the challenger's sets (2) are "opponent's".
      opponentSubmission: { mySetsWon: 0, opponentSetsWon: 2 },
      mismatch: false,
    });
  });

  it('matchResult flags a mismatch once both submitted but disagreeing', async () => {
    const deps = buildDeps();
    const challenge = Challenge.create({
      id: 'challenge-1',
      challengerUserId: 'player-1',
      opponentUserId: 'player-2',
      now: NOW,
    });
    challenge.accept(NOW);
    await deps.challengeRepository.create(challenge);

    const submitMatchScore = createSubmitMatchScore(deps);
    await submitMatchScore({
      userId: 'player-1',
      challengeId: 'challenge-1',
      category: 'CUARTA',
      mySetsWon: 2,
      opponentSetsWon: 0,
      playedAt: new Date('2026-08-14'),
    });
    await submitMatchScore({
      userId: 'player-2',
      challengeId: 'challenge-1',
      category: 'CUARTA',
      mySetsWon: 2,
      opponentSetsWon: 0,
      playedAt: new Date('2026-08-14'),
    });

    const getMyChallenges = createGetMyChallenges(deps);
    const asChallenger = (await getMyChallenges({ userId: 'player-1' })).challenges[0];
    expect(asChallenger.matchResult).toMatchObject({ status: 'PENDING', mismatch: true });
  });
});
