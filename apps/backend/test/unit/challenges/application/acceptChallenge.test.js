import { beforeEach, describe, expect, it } from 'vitest';

import { createAcceptChallenge } from '../../../../src/modules/challenges/application/useCases/acceptChallenge.js';
import { createCreateChallenge } from '../../../../src/modules/challenges/application/useCases/createChallenge.js';
import { ChallengeNotFound } from '../../../../src/modules/challenges/application/errors/ChallengeNotFound.js';
import { InvalidChallengeState } from '../../../../src/modules/challenges/domain/errors/InvalidChallengeState.js';

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
    playerDirectoryProvider: createFakePlayerDirectoryProvider(
      new Map([['player-2', { firstName: 'Luis', lastName: 'Perez' }]]),
    ),
    notificationSender: createFakeNotificationSender(),
    clock: createFakeClock(NOW),
  };
}

describe('acceptChallenge', () => {
  let deps;
  let createChallenge;
  let acceptChallenge;

  beforeEach(() => {
    deps = buildDeps();
    createChallenge = createCreateChallenge(deps);
    acceptChallenge = createAcceptChallenge(deps);
  });

  it('accepts as the opponent and notifies the challenger', async () => {
    const challenge = await createChallenge({
      challengerUserId: 'player-1',
      opponentUserId: 'player-2',
    });

    const result = await acceptChallenge({ userId: 'player-2', challengeId: challenge.id });

    expect(result.status).toBe('ACCEPTED');
    expect(deps.notificationSender.sent).toHaveLength(2); // received + accepted
    const acceptedNotification = deps.notificationSender.sent.find(
      (n) => n.type === 'CHALLENGE_ACCEPTED',
    );
    expect(acceptedNotification).toMatchObject({ recipientId: 'player-1' });
    expect(acceptedNotification.body).toContain('Luis Perez');
  });

  it('throws ChallengeNotFound when the caller is not the opponent', async () => {
    const challenge = await createChallenge({
      challengerUserId: 'player-1',
      opponentUserId: 'player-2',
    });

    await expect(
      acceptChallenge({ userId: 'player-1', challengeId: challenge.id }),
    ).rejects.toThrow(ChallengeNotFound);
  });

  it('throws ChallengeNotFound for a nonexistent id', async () => {
    await expect(
      acceptChallenge({ userId: 'player-2', challengeId: 'does-not-exist' }),
    ).rejects.toThrow(ChallengeNotFound);
  });

  it('throws InvalidChallengeState when already resolved', async () => {
    const challenge = await createChallenge({
      challengerUserId: 'player-1',
      opponentUserId: 'player-2',
    });
    await acceptChallenge({ userId: 'player-2', challengeId: challenge.id });

    await expect(
      acceptChallenge({ userId: 'player-2', challengeId: challenge.id }),
    ).rejects.toThrow(InvalidChallengeState);
  });
});
