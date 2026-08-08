import { beforeEach, describe, expect, it } from 'vitest';

import { createCancelChallenge } from '../../../../src/modules/challenges/application/useCases/cancelChallenge.js';
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

describe('cancelChallenge', () => {
  let deps;
  let createChallenge;
  let cancelChallenge;

  beforeEach(() => {
    deps = buildDeps();
    createChallenge = createCreateChallenge(deps);
    cancelChallenge = createCancelChallenge(deps);
  });

  it('cancels as the challenger and notifies the opponent', async () => {
    const challenge = await createChallenge({
      challengerUserId: 'player-1',
      opponentUserId: 'player-2',
    });

    const result = await cancelChallenge({ userId: 'player-1', challengeId: challenge.id });

    expect(result.status).toBe('CANCELLED');
    const cancelledNotification = deps.notificationSender.sent.find(
      (n) => n.type === 'CHALLENGE_CANCELLED',
    );
    expect(cancelledNotification).toMatchObject({ recipientId: 'player-2' });
  });

  it('throws ChallengeNotFound when the caller is not the challenger', async () => {
    const challenge = await createChallenge({
      challengerUserId: 'player-1',
      opponentUserId: 'player-2',
    });

    await expect(
      cancelChallenge({ userId: 'player-2', challengeId: challenge.id }),
    ).rejects.toThrow(ChallengeNotFound);
  });
});
