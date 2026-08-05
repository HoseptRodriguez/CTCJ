import { beforeEach, describe, expect, it } from 'vitest';

import { createVoidMatch } from '../../../../src/modules/competition/application/useCases/voidMatch.js';
import { MatchNotFound } from '../../../../src/modules/competition/application/errors/MatchNotFound.js';
import { InvalidMatchState } from '../../../../src/modules/competition/domain/errors/InvalidMatchState.js';

import { createFakeCompetitionMatchRepository, createFakeClock } from './fakes.js';

function seedMatch(competitionMatchRepository, overrides = {}) {
  competitionMatchRepository._seed({
    id: 'match-1',
    seasonId: 'season-1',
    category: 'CUARTA',
    modality: 'SINGLES',
    winnerSide: 'A',
    setsWonA: 2,
    setsWonB: 0,
    participantsA: ['p1'],
    participantsB: ['p2'],
    playedAt: new Date('2026-03-01'),
    recordedBy: 'staff-1',
    createdAt: new Date('2026-03-01'),
    ...overrides,
  });
}

describe('voidMatch', () => {
  let competitionMatchRepository;
  let voidMatch;

  beforeEach(() => {
    competitionMatchRepository = createFakeCompetitionMatchRepository();
    seedMatch(competitionMatchRepository);
    voidMatch = createVoidMatch({
      competitionMatchRepository,
      clock: createFakeClock(new Date('2026-03-02')),
    });
  });

  it('voids a RECORDED match', async () => {
    const match = await voidMatch({
      matchId: 'match-1',
      reason: 'resultado incorrecto',
      voidedByUserId: 'staff-2',
    });
    expect(match.status).toBe('VOID');
    expect(match.voidReason).toBe('resultado incorrecto');
    expect(match.voidedBy).toBe('staff-2');
  });

  it('throws MatchNotFound for an unknown matchId', async () => {
    await expect(
      voidMatch({ matchId: 'nonexistent', reason: 'x', voidedByUserId: 'staff-2' }),
    ).rejects.toThrow(MatchNotFound);
  });

  it('throws InvalidMatchState when already VOID', async () => {
    await voidMatch({ matchId: 'match-1', reason: 'x', voidedByUserId: 'staff-2' });
    await expect(
      voidMatch({ matchId: 'match-1', reason: 'y', voidedByUserId: 'staff-2' }),
    ).rejects.toThrow(InvalidMatchState);
  });
});
