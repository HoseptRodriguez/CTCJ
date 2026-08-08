import { beforeEach, describe, expect, it } from 'vitest';

import { createCreateChallenge } from '../../../../src/modules/challenges/application/useCases/createChallenge.js';
import { SelfChallengeForbidden } from '../../../../src/modules/challenges/application/errors/SelfChallengeForbidden.js';
import { PlayerNotEligible } from '../../../../src/modules/challenges/application/errors/PlayerNotEligible.js';
import { ChallengeAlreadyPending } from '../../../../src/modules/challenges/application/errors/ChallengeAlreadyPending.js';

import {
  createFakeChallengeRepository,
  createFakePlayerEligibilityProvider,
  createFakePlayerDirectoryProvider,
  createFakeNotificationSender,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-08-13T10:00:00Z');

function buildDeps(overrides = {}) {
  return {
    challengeRepository: createFakeChallengeRepository(),
    playerEligibilityProvider: createFakePlayerEligibilityProvider(
      new Set(['player-1', 'player-2']),
    ),
    playerDirectoryProvider: createFakePlayerDirectoryProvider(
      new Map([['player-1', { firstName: 'Ana', lastName: 'Gomez' }]]),
    ),
    notificationSender: createFakeNotificationSender(),
    clock: createFakeClock(NOW),
    ...overrides,
  };
}

describe('createChallenge', () => {
  let deps;
  let createChallenge;

  beforeEach(() => {
    deps = buildDeps();
    createChallenge = createCreateChallenge(deps);
  });

  it('creates a PENDING challenge and notifies the opponent', async () => {
    const challenge = await createChallenge({
      challengerUserId: 'player-1',
      opponentUserId: 'player-2',
      message: 'Sábado?',
    });

    expect(challenge).toMatchObject({
      challengerUserId: 'player-1',
      opponentUserId: 'player-2',
      message: 'Sábado?',
      status: 'PENDING',
    });
    expect(deps.notificationSender.sent).toHaveLength(1);
    expect(deps.notificationSender.sent[0]).toMatchObject({
      recipientId: 'player-2',
      type: 'CHALLENGE_RECEIVED',
    });
    expect(deps.notificationSender.sent[0].body).toContain('Ana Gomez');
  });

  it('rejects a self-challenge', async () => {
    await expect(
      createChallenge({ challengerUserId: 'player-1', opponentUserId: 'player-1' }),
    ).rejects.toThrow(SelfChallengeForbidden);
  });

  it('rejects when the opponent does not hold JUGADOR', async () => {
    await expect(
      createChallenge({ challengerUserId: 'player-1', opponentUserId: 'not-a-player' }),
    ).rejects.toThrow(PlayerNotEligible);
  });

  it('rejects when the challenger does not hold JUGADOR', async () => {
    await expect(
      createChallenge({ challengerUserId: 'not-a-player', opponentUserId: 'player-2' }),
    ).rejects.toThrow(PlayerNotEligible);
  });

  it('rejects a duplicate PENDING challenge in either direction', async () => {
    await createChallenge({ challengerUserId: 'player-1', opponentUserId: 'player-2' });

    await expect(
      createChallenge({ challengerUserId: 'player-1', opponentUserId: 'player-2' }),
    ).rejects.toThrow(ChallengeAlreadyPending);
    // Reverse direction also blocked.
    await expect(
      createChallenge({ challengerUserId: 'player-2', opponentUserId: 'player-1' }),
    ).rejects.toThrow(ChallengeAlreadyPending);
  });
});
