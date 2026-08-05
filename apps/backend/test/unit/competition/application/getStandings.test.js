import { beforeEach, describe, expect, it } from 'vitest';

import { createGetStandings } from '../../../../src/modules/competition/application/useCases/getStandings.js';

import {
  createFakeCompetitionMatchRepository,
  createFakePlayerDirectoryProvider,
  createFakeSeasonRepository,
} from './fakes.js';

describe('getStandings', () => {
  let competitionMatchRepository;
  let seasonRepository;
  let getStandings;

  beforeEach(() => {
    competitionMatchRepository = createFakeCompetitionMatchRepository();
    seasonRepository = createFakeSeasonRepository();
    const names = new Map([
      ['p1', { firstName: 'Ana', lastName: 'Gomez' }],
      ['p2', { firstName: 'Beto', lastName: 'Ruiz' }],
    ]);
    getStandings = createGetStandings({
      competitionMatchRepository,
      playerDirectoryProvider: createFakePlayerDirectoryProvider(names),
      seasonRepository,
      clubId: 'club-1',
    });
  });

  it('computes standings from recorded matches with resolved player names', async () => {
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
      createdAt: new Date('2026-03-01'),
    });

    const rows = await getStandings({
      seasonId: 'season-1',
      category: 'CUARTA',
      modality: 'SINGLES',
    });
    const p1 = rows.find((r) => r.playerId === 'p1');
    expect(p1.playerName).toBe('Ana Gomez');
    expect(p1.points).toBe(2);
    expect(p1.rank).toBe(1);
  });

  it('excludes VOID matches from standings', async () => {
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
      createdAt: new Date('2026-03-01'),
      voidedAt: new Date('2026-03-02'),
      voidedBy: 'staff-2',
      voidReason: 'x',
    });

    const rows = await getStandings({
      seasonId: 'season-1',
      category: 'CUARTA',
      modality: 'SINGLES',
    });
    expect(rows).toEqual([]);
  });

  it('returns an empty array for a season/category/modality with no matches', async () => {
    const rows = await getStandings({
      seasonId: 'season-1',
      category: 'QUINTA',
      modality: 'DOBLES',
    });
    expect(rows).toEqual([]);
  });

  it("defaults to the club's current OPEN season when seasonId is omitted", async () => {
    seasonRepository._seed({
      id: 'season-open',
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
    });
    competitionMatchRepository._seed({
      seasonId: 'season-open',
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
    });

    const rows = await getStandings({ category: 'CUARTA', modality: 'SINGLES' });
    expect(rows.find((r) => r.playerId === 'p1').points).toBe(2);
  });

  it('returns an empty array when seasonId is omitted and the club has no OPEN season', async () => {
    const rows = await getStandings({ category: 'CUARTA', modality: 'SINGLES' });
    expect(rows).toEqual([]);
  });
});
