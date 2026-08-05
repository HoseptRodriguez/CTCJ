import { beforeEach, describe, expect, it } from 'vitest';

import { createListPlayerPerformance } from '../../../../src/modules/coaching/application/useCases/listPlayerPerformance.js';

import { createFakePerformanceRatingRepository } from './fakes.js';

describe('listPlayerPerformance', () => {
  let performanceRatingRepository;
  let listPlayerPerformance;

  beforeEach(() => {
    performanceRatingRepository = createFakePerformanceRatingRepository();
    listPlayerPerformance = createListPlayerPerformance({ performanceRatingRepository });
  });

  it('returns the full history and a derived summary', async () => {
    performanceRatingRepository._seed({
      playerId: 'player-1',
      coachId: 'coach-1',
      area: 'FOREHAND',
      rating: 7,
      recordedAt: new Date('2026-01-01'),
    });

    const result = await listPlayerPerformance({ playerId: 'player-1' });
    expect(result.ratings).toHaveLength(1);
    expect(result.summary.latestByArea).toEqual({ FOREHAND: 7 });
  });

  it('returns an empty summary for a player with zero ratings', async () => {
    const result = await listPlayerPerformance({ playerId: 'player-1' });
    expect(result.ratings).toEqual([]);
    expect(result.summary).toEqual({ ratedAreas: [], latestByArea: {}, progressByArea: {} });
  });

  it("scopes to the requested player only, not another player's ratings", async () => {
    performanceRatingRepository._seed({
      playerId: 'player-2',
      coachId: 'coach-1',
      area: 'SERVE',
      rating: 9,
      recordedAt: new Date('2026-01-01'),
    });

    const result = await listPlayerPerformance({ playerId: 'player-1' });
    expect(result.ratings).toEqual([]);
  });
});
