import { beforeEach, describe, expect, it } from 'vitest';

import { createGetMyCompetitionSummary } from '../../../../src/modules/competition/application/useCases/getMyCompetitionSummary.js';

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

describe('getMyCompetitionSummary', () => {
  let competitionMatchRepository;
  let seasonRepository;
  let getMyCompetitionSummary;

  beforeEach(() => {
    competitionMatchRepository = createFakeCompetitionMatchRepository();
    seasonRepository = createFakeSeasonRepository();
    const names = new Map([
      ['p1', { firstName: 'Ana', lastName: 'Gomez' }],
      ['p2', { firstName: 'Beto', lastName: 'Ruiz' }],
      ['p3', { firstName: 'Caro', lastName: 'Diaz' }],
    ]);
    getMyCompetitionSummary = createGetMyCompetitionSummary({
      competitionMatchRepository,
      playerDirectoryProvider: createFakePlayerDirectoryProvider(names),
      seasonRepository,
      clubId: 'club-1',
    });
  });

  it('returns an empty, non-error state when there is no open season', async () => {
    const result = await getMyCompetitionSummary({ playerId: 'p1' });
    expect(result).toEqual({ hasSeason: false, categories: [], recentMatches: [] });
  });

  it('returns an empty category/match list when the player has no matches yet', async () => {
    seedOpenSeason(seasonRepository);
    const result = await getMyCompetitionSummary({ playerId: 'p1' });
    expect(result).toEqual({ hasSeason: true, categories: [], recentMatches: [] });
  });

  it('discovers the category/modality the player has played and computes rank/points/win-loss', async () => {
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
      category: 'CUARTA',
      modality: 'SINGLES',
      winnerSide: 'B',
      setsWonA: 0,
      setsWonB: 2,
      participantsA: ['p1'],
      participantsB: ['p3'],
      playedAt: new Date('2026-03-05'),
      recordedBy: 'staff-1',
    });

    const result = await getMyCompetitionSummary({ playerId: 'p1' });

    expect(result.hasSeason).toBe(true);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0]).toMatchObject({
      category: 'CUARTA',
      modality: 'SINGLES',
      wins: 1,
      losses: 1,
      matchesPlayed: 2,
      winPercentage: 50,
    });
    expect(result.categories[0].rank).toBeGreaterThanOrEqual(1);
  });

  it('separates categories/modalities the player played in multiple of', async () => {
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
      category: 'CUARTA',
      modality: 'DOBLES',
      winnerSide: 'A',
      setsWonA: 2,
      setsWonB: 1,
      participantsA: ['p1', 'p3'],
      participantsB: ['p2'],
      playedAt: new Date('2026-03-02'),
      recordedBy: 'staff-1',
    });

    const result = await getMyCompetitionSummary({ playerId: 'p1' });

    expect(result.categories).toHaveLength(2);
    const singles = result.categories.find((c) => c.modality === 'SINGLES');
    const doubles = result.categories.find((c) => c.modality === 'DOBLES');
    expect(singles.wins).toBe(1);
    expect(doubles.wins).toBe(1);
  });

  it('enriches recent matches with opponent names and a won flag, newest first', async () => {
    seedOpenSeason(seasonRepository);
    competitionMatchRepository._seed({
      seasonId: 'season-1',
      category: 'CUARTA',
      modality: 'SINGLES',
      winnerSide: 'B',
      setsWonA: 0,
      setsWonB: 2,
      participantsA: ['p1'],
      participantsB: ['p2'],
      playedAt: new Date('2026-03-01'),
      recordedBy: 'staff-1',
    });
    competitionMatchRepository._seed({
      seasonId: 'season-1',
      category: 'CUARTA',
      modality: 'SINGLES',
      winnerSide: 'A',
      setsWonA: 2,
      setsWonB: 0,
      participantsA: ['p1'],
      participantsB: ['p3'],
      playedAt: new Date('2026-03-10'),
      recordedBy: 'staff-1',
    });

    const result = await getMyCompetitionSummary({ playerId: 'p1' });

    expect(result.recentMatches).toHaveLength(2);
    expect(result.recentMatches[0].won).toBe(true);
    expect(result.recentMatches[0].participantsB[0]).toMatchObject({
      playerId: 'p3',
      firstName: 'Caro',
    });
    expect(result.recentMatches[1].won).toBe(false);
  });

  it('excludes VOID matches from both categories and recent matches', async () => {
    seedOpenSeason(seasonRepository);
    competitionMatchRepository._seed({
      seasonId: 'season-1',
      category: 'CUARTA',
      modality: 'SINGLES',
      status: 'VOID',
      winnerSide: 'A',
      setsWonA: 2,
      setsWonB: 0,
      participantsA: ['p1'],
      participantsB: ['p2'],
      playedAt: new Date('2026-03-01'),
      recordedBy: 'staff-1',
    });

    const result = await getMyCompetitionSummary({ playerId: 'p1' });
    expect(result).toEqual({ hasSeason: true, categories: [], recentMatches: [] });
  });
});
