import { describe, expect, it } from 'vitest';

import { CompetitionMatch } from '../../../../src/modules/competition/domain/entities/CompetitionMatch.js';
import { InvalidWinnerSide } from '../../../../src/modules/competition/domain/errors/InvalidWinnerSide.js';

function baseArgs(overrides = {}) {
  return {
    id: 'match-1',
    seasonId: 'season-1',
    category: 'CUARTA',
    modality: 'SINGLES',
    participantsA: ['p1'],
    participantsB: ['p2'],
    winnerSide: 'A',
    setsWonA: 2,
    setsWonB: 0,
    playedAt: new Date('2026-03-01'),
    recordedBy: 'staff-1',
    now: new Date('2026-03-01'),
    ...overrides,
  };
}

describe('Regla: coherencia de ganador', () => {
  it('accepts winnerSide A when A has more sets', () => {
    const match = CompetitionMatch.record(baseArgs({ winnerSide: 'A', setsWonA: 2, setsWonB: 1 }));
    expect(match.winnerSide).toBe('A');
  });

  it('accepts winnerSide B when B has more sets', () => {
    const match = CompetitionMatch.record(baseArgs({ winnerSide: 'B', setsWonA: 0, setsWonB: 2 }));
    expect(match.winnerSide).toBe('B');
  });

  it('throws when winnerSide A does not have more sets than B', () => {
    expect(() =>
      CompetitionMatch.record(baseArgs({ winnerSide: 'A', setsWonA: 1, setsWonB: 2 })),
    ).toThrow(InvalidWinnerSide);
  });

  it('throws when sets are tied', () => {
    expect(() =>
      CompetitionMatch.record(baseArgs({ winnerSide: 'A', setsWonA: 1, setsWonB: 1 })),
    ).toThrow(InvalidWinnerSide);
  });

  it('throws when winnerSide is neither A nor B', () => {
    expect(() => CompetitionMatch.record(baseArgs({ winnerSide: 'C' }))).toThrow(InvalidWinnerSide);
  });
});
