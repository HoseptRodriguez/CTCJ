import { beforeEach, describe, expect, it } from 'vitest';

import { createRejectChallenge } from '../../../../src/modules/challenges/application/useCases/rejectChallenge.js';
import { createCreateChallenge } from '../../../../src/modules/challenges/application/useCases/createChallenge.js';
import { ChallengeNotFound } from '../../../../src/modules/challenges/application/errors/ChallengeNotFound.js';

import {
  createFakeChallengeRepository,
  createFakePlayerEligibilityProvider,
  createFakePlayerDirectoryProvider,
  createFakeNotificationSender,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-08-13T10:00:00Z');

function buildDeps() {
  return {
    challengeRepository: createFakeChallengeRepository(),
    playerEligibilityProvider: createFakePlayerEligibilityProvider(
      new Set(['player-1', 'player-2']),
    ),
    playerDirectoryProvider: createFakePlayerDirectoryProvider(new Map()),
    notificationSender: createFakeNotificationSender(),
    clock: createFakeClock(NOW),
  };
}

describe('rejectChallenge', () => {
  let deps;
  let createChallenge;
  let rejectChallenge;

  beforeEach(() => {
    deps = buildDeps();
    createChallenge = createCreateChallenge(deps);
    rejectChallenge = createRejectChallenge(deps);
  });

  it('rejects as the opponent and notifies the challenger', async () => {
    const challenge = await createChallenge({
      challengerUserId: 'player-1',
      opponentUserId: 'player-2',
    });

    const result = await rejectChallenge({ userId: 'player-2', challengeId: challenge.id });

    expect(result.status).toBe('REJECTED');
    const rejectedNotification = deps.notificationSender.sent.find(
      (n) => n.type === 'CHALLENGE_REJECTED',
    );
    expect(rejectedNotification).toMatchObject({ recipientId: 'player-1' });
  });

  it('throws ChallengeNotFound when the caller is not the opponent', async () => {
    const challenge = await createChallenge({
      challengerUserId: 'player-1',
      opponentUserId: 'player-2',
    });

    await expect(
      rejectChallenge({ userId: 'player-1', challengeId: challenge.id }),
    ).rejects.toThrow(ChallengeNotFound);
  });
});
