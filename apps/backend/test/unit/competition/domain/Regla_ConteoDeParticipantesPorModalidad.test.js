import { describe, expect, it } from 'vitest';

import { CompetitionMatch } from '../../../../src/modules/competition/domain/entities/CompetitionMatch.js';
import { InvalidParticipantCount } from '../../../../src/modules/competition/domain/errors/InvalidParticipantCount.js';

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

describe('Regla: conteo de participantes por modalidad', () => {
  it('SINGLES requires exactly 1 participant per side', () => {
    const match = CompetitionMatch.record(baseArgs());
    expect(match.participantsA).toEqual(['p1']);
    expect(match.participantsB).toEqual(['p2']);
  });

  it('SINGLES throws when a side has 2 participants', () => {
    expect(() => CompetitionMatch.record(baseArgs({ participantsA: ['p1', 'p3'] }))).toThrow(
      InvalidParticipantCount,
    );
  });

  it('DOBLES requires exactly 2 participants per side', () => {
    const match = CompetitionMatch.record(
      baseArgs({ modality: 'DOBLES', participantsA: ['p1', 'p2'], participantsB: ['p3', 'p4'] }),
    );
    expect(match.participantsA).toEqual(['p1', 'p2']);
    expect(match.participantsB).toEqual(['p3', 'p4']);
  });

  it('DOBLES throws when a side has only 1 participant', () => {
    expect(() =>
      CompetitionMatch.record(
        baseArgs({ modality: 'DOBLES', participantsA: ['p1'], participantsB: ['p3', 'p4'] }),
      ),
    ).toThrow(InvalidParticipantCount);
  });
});
