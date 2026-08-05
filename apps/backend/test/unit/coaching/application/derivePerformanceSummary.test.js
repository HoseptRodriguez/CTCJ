import { describe, expect, it } from 'vitest';

import { derivePerformanceSummary } from '../../../../src/modules/coaching/application/useCases/derivePerformanceSummary.js';

function row(area, rating, recordedAt) {
  return {
    id: `${area}-${recordedAt}`,
    playerId: 'player-1',
    coachId: 'coach-1',
    area,
    rating,
    recordedAt: new Date(recordedAt),
  };
}

describe('derivePerformanceSummary', () => {
  it('returns empty structures for no ratings at all', () => {
    expect(derivePerformanceSummary([])).toEqual({
      ratedAreas: [],
      latestByArea: {},
      progressByArea: {},
    });
  });

  it('excludes never-rated areas entirely -- never defaults to 0', () => {
    const summary = derivePerformanceSummary([row('FOREHAND', 7, '2026-01-01')]);
    expect(summary.ratedAreas).toEqual(['FOREHAND']);
    expect(summary.latestByArea).toEqual({ FOREHAND: 7 });
    expect(summary.latestByArea.BACKHAND).toBeUndefined();
  });

  it('uses only the latest rating per area, not an average', () => {
    const summary = derivePerformanceSummary([
      row('FOREHAND', 4, '2026-01-01'),
      row('FOREHAND', 8, '2026-02-01'),
    ]);
    expect(summary.latestByArea.FOREHAND).toBe(8);
  });

  it('computes progress as latest minus previous, only for areas with >= 2 ratings', () => {
    const summary = derivePerformanceSummary([
      row('FOREHAND', 4, '2026-01-01'),
      row('FOREHAND', 7, '2026-02-01'),
      row('SERVE', 5, '2026-01-01'),
    ]);
    expect(summary.progressByArea.FOREHAND).toBe(3);
    expect(summary.progressByArea.SERVE).toBeUndefined();
  });

  it('supports a negative progress delta', () => {
    const summary = derivePerformanceSummary([
      row('FOREHAND', 8, '2026-01-01'),
      row('FOREHAND', 5, '2026-02-01'),
    ]);
    expect(summary.progressByArea.FOREHAND).toBe(-3);
  });

  it('sorts ratedAreas by latest rating descending', () => {
    const summary = derivePerformanceSummary([
      row('FOREHAND', 4, '2026-01-01'),
      row('SERVE', 9, '2026-01-01'),
      row('VOLLEY', 6, '2026-01-01'),
    ]);
    expect(summary.ratedAreas).toEqual(['SERVE', 'VOLLEY', 'FOREHAND']);
  });

  it('breaks ties deterministically by area name (alphabetical)', () => {
    const summary = derivePerformanceSummary([
      row('SERVE', 6, '2026-01-01'),
      row('BACKHAND', 6, '2026-01-01'),
    ]);
    expect(summary.ratedAreas).toEqual(['BACKHAND', 'SERVE']);
  });
});
