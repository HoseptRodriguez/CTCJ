import { beforeEach, describe, expect, it } from 'vitest';

import { createListMatches } from '../../../../src/modules/competition/application/useCases/listMatches.js';

import {
  createFakeCompetitionMatchRepository,
  createFakePlayerDirectoryProvider,
  createFakeSeasonRepository,
} from './fakes.js';

describe('listMatches', () => {
  let competitionMatchRepository;
  let seasonRepository;
  let listMatches;

  beforeEach(() => {
    competitionMatchRepository = createFakeCompetitionMatchRepository();
    seasonRepository = createFakeSeasonRepository();
    const names = new Map([
      ['p1', { firstName: 'Ana', lastName: 'Gomez' }],
      ['p2', { firstName: 'Beto', lastName: 'Ruiz' }],
    ]);
    listMatches = createListMatches({
      competitionMatchRepository,
      playerDirectoryProvider: createFakePlayerDirectoryProvider(names),
      seasonRepository,
      clubId: 'club-1',
    });

    competitionMatchRepository._seed({
      id: 'match-recorded',
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
    competitionMatchRepository._seed({
      id: 'match-void',
      seasonId: 'season-1',
      category: 'CUARTA',
      modality: 'SINGLES',
      status: 'VOID',
      winnerSide: 'A',
      setsWonA: 2,
      setsWonB: 1,
      participantsA: ['p1'],
      participantsB: ['p2'],
      playedAt: new Date('2026-03-05'),
      recordedBy: 'staff-1',
      createdAt: new Date('2026-03-05'),
      voidedAt: new Date('2026-03-06'),
      voidedBy: 'staff-2',
      voidReason: 'error',
    });
  });

  it('includes VOID matches (staff history shows a VOID badge, unlike standings)', async () => {
    const matches = await listMatches({
      seasonId: 'season-1',
      category: 'CUARTA',
      modality: 'SINGLES',
    });
    expect(matches).toHaveLength(2);
    expect(matches.some((m) => m.status === 'VOID')).toBe(true);
  });

  it('enriches participant ids with resolved player names', async () => {
    const matches = await listMatches({
      seasonId: 'season-1',
      category: 'CUARTA',
      modality: 'SINGLES',
    });
    const recorded = matches.find((m) => m.id === 'match-recorded');
    expect(recorded.participantsA[0]).toMatchObject({
      playerId: 'p1',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    expect(recorded.participantsB[0]).toMatchObject({
      playerId: 'p2',
      firstName: 'Beto',
      lastName: 'Ruiz',
    });
  });

  it('filters by playerId when provided', async () => {
    competitionMatchRepository._seed({
      id: 'match-other-players',
      seasonId: 'season-1',
      category: 'CUARTA',
      modality: 'SINGLES',
      winnerSide: 'A',
      setsWonA: 2,
      setsWonB: 0,
      participantsA: ['p3'],
      participantsB: ['p4'],
      playedAt: new Date('2026-03-07'),
      recordedBy: 'staff-1',
      createdAt: new Date('2026-03-07'),
    });

    const matches = await listMatches({
      seasonId: 'season-1',
      category: 'CUARTA',
      modality: 'SINGLES',
      playerId: 'p1',
    });
    expect(matches.every((m) => m.id !== 'match-other-players')).toBe(true);
  });

  it('returns an empty array when seasonId is omitted and the club has no OPEN season', async () => {
    const matches = await listMatches({ category: 'CUARTA', modality: 'SINGLES' });
    expect(matches).toEqual([]);
  });
});
