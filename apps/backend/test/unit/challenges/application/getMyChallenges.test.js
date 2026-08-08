import { describe, expect, it } from 'vitest';

import { createGetMyChallenges } from '../../../../src/modules/challenges/application/useCases/getMyChallenges.js';
import { createCreateChallenge } from '../../../../src/modules/challenges/application/useCases/createChallenge.js';

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
      new Set(['player-1', 'player-2', 'player-3']),
    ),
    playerDirectoryProvider: createFakePlayerDirectoryProvider(
      new Map([
        ['player-1', { firstName: 'Ana', lastName: 'Gomez' }],
        ['player-2', { firstName: 'Luis', lastName: 'Perez' }],
        ['player-3', { firstName: 'Caro', lastName: 'Diaz' }],
      ]),
    ),
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
});
