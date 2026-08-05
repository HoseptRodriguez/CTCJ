import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createRecordPerformanceSnapshot } from '../../../../src/modules/coaching/application/useCases/recordPerformanceSnapshot.js';
import { PlayerNotEligible } from '../../../../src/modules/coaching/application/errors/PlayerNotEligible.js';

import {
  createFakePerformanceRatingRepository,
  createFakePlayerEligibilityProvider,
} from './fakes.js';

describe('recordPerformanceSnapshot', () => {
  let performanceRatingRepository;
  let recordPerformanceSnapshot;

  beforeEach(() => {
    performanceRatingRepository = createFakePerformanceRatingRepository();
    recordPerformanceSnapshot = createRecordPerformanceSnapshot({
      performanceRatingRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-1'])),
    });
  });

  it('creates one row per area present in a partial map', async () => {
    const rows = await recordPerformanceSnapshot({
      playerId: 'player-1',
      ratings: { SERVE: 6 },
      coachUserId: 'coach-1',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      playerId: 'player-1',
      coachId: 'coach-1',
      area: 'SERVE',
      rating: 6,
    });
  });

  it('creates one row per area for a full 6-area map', async () => {
    const rows = await recordPerformanceSnapshot({
      playerId: 'player-1',
      ratings: { FOREHAND: 7, BACKHAND: 6, SERVE: 8, RETURN: 5, VOLLEY: 6, OVERHEAD: 4 },
      coachUserId: 'coach-1',
    });
    expect(rows).toHaveLength(6);
  });

  it('throws PlayerNotEligible before touching the repository when the target is not JUGADOR', async () => {
    const createBatchSpy = vi.spyOn(performanceRatingRepository, 'createBatch');

    await expect(
      recordPerformanceSnapshot({
        playerId: 'not-a-player',
        ratings: { SERVE: 6 },
        coachUserId: 'coach-1',
      }),
    ).rejects.toThrow(PlayerNotEligible);
    expect(createBatchSpy).not.toHaveBeenCalled();
  });
});
