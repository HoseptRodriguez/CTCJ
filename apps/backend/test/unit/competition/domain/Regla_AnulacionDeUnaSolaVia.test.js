import { describe, expect, it } from 'vitest';

import { CompetitionMatch } from '../../../../src/modules/competition/domain/entities/CompetitionMatch.js';
import { InvalidMatchState } from '../../../../src/modules/competition/domain/errors/InvalidMatchState.js';

function buildMatch() {
  return CompetitionMatch.record({
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
  });
}

describe('Regla: anulación de una sola vía', () => {
  it('voidOut() is legal from RECORDED', () => {
    const match = buildMatch();
    const now = new Date('2026-03-02');
    match.voidOut({ reason: 'resultado incorrecto', voidedBy: 'staff-2', now });

    expect(match.status).toBe('VOID');
    expect(match.voidedAt).toBe(now);
    expect(match.voidedBy).toBe('staff-2');
    expect(match.voidReason).toBe('resultado incorrecto');
  });

  it('voidOut() throws when already VOID', () => {
    const match = buildMatch();
    match.voidOut({ reason: 'x', voidedBy: 'staff-2', now: new Date('2026-03-02') });

    expect(() =>
      match.voidOut({ reason: 'y', voidedBy: 'staff-2', now: new Date('2026-03-03') }),
    ).toThrow(InvalidMatchState);
  });
});
