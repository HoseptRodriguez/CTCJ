import { describe, expect, it } from 'vitest';

import { CompetitionMatch } from '../../../../src/modules/competition/domain/entities/CompetitionMatch.js';
import { DuplicateParticipant } from '../../../../src/modules/competition/domain/errors/DuplicateParticipant.js';

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

describe('Regla: sin jugador duplicado', () => {
  it('throws when the same player appears on both sides', () => {
    expect(() =>
      CompetitionMatch.record(baseArgs({ participantsA: ['p1'], participantsB: ['p1'] })),
    ).toThrow(DuplicateParticipant);
  });

  it('throws when the same player appears twice within a doubles side', () => {
    expect(() =>
      CompetitionMatch.record(
        baseArgs({
          modality: 'DOBLES',
          participantsA: ['p1', 'p1'],
          participantsB: ['p3', 'p4'],
        }),
      ),
    ).toThrow(DuplicateParticipant);
  });

  it('allows 4 distinct players in doubles', () => {
    const match = CompetitionMatch.record(
      baseArgs({ modality: 'DOBLES', participantsA: ['p1', 'p2'], participantsB: ['p3', 'p4'] }),
    );
    expect(match.id).toBe('match-1');
  });
});
