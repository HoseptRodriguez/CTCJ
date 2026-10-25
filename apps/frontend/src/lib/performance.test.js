import { describe, expect, it } from 'vitest';

import { compareWithPast, highlights } from './performance.js';

const NOW = new Date('2026-09-25T12:00:00Z');
const daysAgo = (d) => new Date(NOW.getTime() - d * 86400000).toISOString();

describe('compareWithPast', () => {
  it('takes the latest rating now and the one current 90 days ago', () => {
    const ratings = [
      { area: 'SERVE', rating: 4, recordedAt: daysAgo(200) },
      { area: 'SERVE', rating: 5, recordedAt: daysAgo(100) },
      { area: 'SERVE', rating: 8, recordedAt: daysAgo(5) },
    ];
    expect(compareWithPast(ratings, { now: NOW }).SERVE).toEqual({ now: 8, past: 5 });
  });

  it('has no past value when every rating is recent, and nulls for unrated skills', () => {
    const result = compareWithPast([{ area: 'VOLLEY', rating: 6, recordedAt: daysAgo(10) }], {
      now: NOW,
    });
    expect(result.VOLLEY).toEqual({ now: 6, past: null });
    expect(result.FOREHAND).toEqual({ now: null, past: null });
  });
});

describe('highlights', () => {
  it('picks the biggest gain and the lowest current skill', () => {
    const comparison = compareWithPast(
      [
        { area: 'SERVE', rating: 5, recordedAt: daysAgo(120) },
        { area: 'SERVE', rating: 8, recordedAt: daysAgo(2) },
        { area: 'BACKHAND', rating: 6, recordedAt: daysAgo(120) },
        { area: 'BACKHAND', rating: 7, recordedAt: daysAgo(2) },
        { area: 'FOOTWORK', rating: 3, recordedAt: daysAgo(2) },
      ],
      { now: NOW },
    );
    expect(highlights(comparison)).toEqual({
      mostImproved: { area: 'SERVE', gain: 3 },
      toWorkOn: { area: 'FOOTWORK', rating: 3 },
    });
  });

  it('reports no "most improved" when nothing went up', () => {
    const comparison = compareWithPast([{ area: 'SERVE', rating: 5, recordedAt: daysAgo(2) }], {
      now: NOW,
    });
    expect(highlights(comparison).mostImproved).toBeNull();
  });
});
