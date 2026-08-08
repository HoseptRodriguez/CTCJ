import { beforeEach, describe, expect, it } from 'vitest';

import { createRecordMatch } from '../../../../src/modules/competition/application/useCases/recordMatch.js';
import { createRecordMatchForOpenSeason } from '../../../../src/modules/competition/application/useCases/recordMatchForOpenSeason.js';
import { NoOpenSeason } from '../../../../src/modules/competition/application/errors/NoOpenSeason.js';

import {
  createFakeSeasonRepository,
  createFakeCompetitionMatchRepository,
  createFakePlayerEligibilityProvider,
  createFakeClock,
} from './fakes.js';

function seedOpenSeason(seasonRepository, overrides = {}) {
  seasonRepository._seed({
    id: 'season-1',
    clubId: 'club-1',
    name: 'Temporada 1 · 2026',
    year: 2026,
    seasonNumber: 1,
    status: 'OPEN',
    startDate: new Date('2026-01-01'),
    endDate: null,
    createdBy: 'admin-1',
    createdAt: new Date('2026-01-01'),
    closedAt: null,
    closedBy: null,
    ...overrides,
  });
}

describe('recordMatchForOpenSeason', () => {
  let seasonRepository;
  let competitionMatchRepository;
  let recordMatchForOpenSeason;

  beforeEach(() => {
    seasonRepository = createFakeSeasonRepository();
    competitionMatchRepository = createFakeCompetitionMatchRepository();
    const recordMatch = createRecordMatch({
      seasonRepository,
      competitionMatchRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['p1', 'p2'])),
      clock: createFakeClock(new Date('2026-03-01')),
    });
    recordMatchForOpenSeason = createRecordMatchForOpenSeason({
      seasonRepository,
      recordMatch,
      clubId: 'club-1',
    });
  });

  const baseInput = {
    category: 'CUARTA',
    modality: 'SINGLES',
    participantsA: ['p1'],
    participantsB: ['p2'],
    winnerSide: 'A',
    setsWonA: 2,
    setsWonB: 0,
    playedAt: new Date('2026-03-01'),
    recordedByUserId: 'p1',
  };

  it('resolves the open season and records the match without an explicit seasonId', async () => {
    seedOpenSeason(seasonRepository);
    const match = await recordMatchForOpenSeason(baseInput);
    expect(match.seasonId).toBe('season-1');
    expect(match.status).toBe('RECORDED');
  });

  it('throws NoOpenSeason when the club has no open season', async () => {
    await expect(recordMatchForOpenSeason(baseInput)).rejects.toThrow(NoOpenSeason);
  });

  it('throws NoOpenSeason when the only season is CLOSED, without touching the match repository', async () => {
    seedOpenSeason(seasonRepository, {
      status: 'CLOSED',
      closedAt: new Date('2026-02-01'),
      closedBy: 'admin-1',
    });
    await expect(recordMatchForOpenSeason(baseInput)).rejects.toThrow(NoOpenSeason);
    expect(
      await competitionMatchRepository.list({
        seasonId: 'season-1',
        category: 'CUARTA',
        modality: 'SINGLES',
      }),
    ).toHaveLength(0);
  });
});
