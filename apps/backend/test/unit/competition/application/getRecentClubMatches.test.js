import { beforeEach, describe, expect, it } from 'vitest';

import { createGetRecentClubMatches } from '../../../../src/modules/competition/application/useCases/getRecentClubMatches.js';

import {
  createFakeCompetitionMatchRepository,
  createFakePlayerDirectoryProvider,
  createFakeSeasonRepository,
} from './fakes.js';

function seedOpenSeason(seasonRepository) {
  seasonRepository._seed({
    id: 'season-1',
    clubId: 'club-1',
    name: 'Temporada 1',
    year: 2026,
    seasonNumber: 1,
    status: 'OPEN',
    startDate: new Date('2026-01-01'),
    createdBy: 'admin-1',
  });
}

describe('getRecentClubMatches', () => {
  let competitionMatchRepository;
  let seasonRepository;
  let getRecentClubMatches;

  beforeEach(() => {
    competitionMatchRepository = createFakeCompetitionMatchRepository();
    seasonRepository = createFakeSeasonRepository();
    const names = new Map([
      ['p1', { firstName: 'Ana', lastName: 'Gomez' }],
      ['p2', { firstName: 'Beto', lastName: 'Ruiz' }],
    ]);
    getRecentClubMatches = createGetRecentClubMatches({
      competitionMatchRepository,
      playerDirectoryProvider: createFakePlayerDirectoryProvider(names),
      seasonRepository,
      clubId: 'club-1',
    });
  });

  it('returns an empty list when there is no open season', async () => {
    const result = await getRecentClubMatches();
    expect(result).toEqual({ matches: [] });
  });

  it('returns club-wide matches across every category/modality, newest first, enriched with names', async () => {
    seedOpenSeason(seasonRepository);
    competitionMatchRepository._seed({
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
    });
    competitionMatchRepository._seed({
      seasonId: 'season-1',
      category: 'TERCERA',
      modality: 'DOBLES',
      winnerSide: 'B',
      setsWonA: 0,
      setsWonB: 2,
      participantsA: ['p2'],
      participantsB: ['p1'],
      playedAt: new Date('2026-03-10'),
      recordedBy: 'staff-1',
    });

    const result = await getRecentClubMatches();

    expect(result.matches).toHaveLength(2);
    expect(result.matches[0].category).toBe('TERCERA'); // newest first
    expect(result.matches[0].participantsA[0]).toMatchObject({ playerId: 'p2', firstName: 'Beto' });
  });

  it('excludes VOID matches', async () => {
    seedOpenSeason(seasonRepository);
    competitionMatchRepository._seed({
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
      status: 'VOID',
    });

    const result = await getRecentClubMatches();

    expect(result.matches).toHaveLength(0);
  });

  it('caps results at the requested limit', async () => {
    seedOpenSeason(seasonRepository);
    for (let i = 0; i < 20; i += 1) {
      competitionMatchRepository._seed({
        seasonId: 'season-1',
        category: 'CUARTA',
        modality: 'SINGLES',
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 0,
        participantsA: ['p1'],
        participantsB: ['p2'],
        playedAt: new Date(2026, 2, i + 1),
        recordedBy: 'staff-1',
      });
    }

    const defaultResult = await getRecentClubMatches();
    expect(defaultResult.matches).toHaveLength(15);

    const limitedResult = await getRecentClubMatches({ limit: 5 });
    expect(limitedResult.matches).toHaveLength(5);
  });
});
