import { beforeEach, describe, expect, it } from 'vitest';

import { createGetMyPerformance } from '../../../../src/modules/coaching/application/useCases/getMyPerformance.js';

import { createFakePerformanceRatingRepository } from './fakes.js';

describe('getMyPerformance', () => {
  let performanceRatingRepository;
  let getMyPerformance;

  beforeEach(() => {
    performanceRatingRepository = createFakePerformanceRatingRepository();
    getMyPerformance = createGetMyPerformance({ performanceRatingRepository });
  });

  it('returns the same shape as listPlayerPerformance, with no visibility filtering', async () => {
    performanceRatingRepository._seed({
      playerId: 'player-1',
      coachId: 'coach-1',
      area: 'SERVE',
      rating: 8,
      recordedAt: new Date('2026-01-01'),
    });

    const result = await getMyPerformance({ playerId: 'player-1' });
    expect(result.ratings).toHaveLength(1);
    expect(result.summary.latestByArea).toEqual({ SERVE: 8 });
  });

  it('returns an empty result for a player with zero ratings', async () => {
    const result = await getMyPerformance({ playerId: 'player-1' });
    expect(result.ratings).toEqual([]);
    expect(result.summary.ratedAreas).toEqual([]);
  });
});
