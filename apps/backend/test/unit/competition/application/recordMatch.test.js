import { beforeEach, describe, expect, it } from 'vitest';

import { createRecordMatch } from '../../../../src/modules/competition/application/useCases/recordMatch.js';
import { SeasonNotFound } from '../../../../src/modules/competition/application/errors/SeasonNotFound.js';
import { PlayerNotEligible } from '../../../../src/modules/competition/application/errors/PlayerNotEligible.js';
import { InvalidSeasonState } from '../../../../src/modules/competition/domain/errors/InvalidSeasonState.js';
import { InvalidParticipantCount } from '../../../../src/modules/competition/domain/errors/InvalidParticipantCount.js';

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

describe('recordMatch', () => {
  let seasonRepository;
  let competitionMatchRepository;
  let recordMatch;

  beforeEach(() => {
    seasonRepository = createFakeSeasonRepository();
    competitionMatchRepository = createFakeCompetitionMatchRepository();
    seedOpenSeason(seasonRepository);
    recordMatch = createRecordMatch({
      seasonRepository,
      competitionMatchRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(
        new Set(['p1', 'p2', 'p3', 'p4']),
      ),
      clock: createFakeClock(new Date('2026-03-01')),
    });
  });

  const baseInput = {
    seasonId: 'season-1',
    category: 'CUARTA',
    modality: 'SINGLES',
    participantsA: ['p1'],
    participantsB: ['p2'],
    winnerSide: 'A',
    setsWonA: 2,
    setsWonB: 0,
    playedAt: new Date('2026-03-01'),
    recordedByUserId: 'staff-1',
  };

  it('records a singles match when the season is open and all participants are eligible', async () => {
    const match = await recordMatch(baseInput);
    expect(match.status).toBe('RECORDED');
    expect(match.participantsA).toEqual(['p1']);
    expect(match.participantsB).toEqual(['p2']);
  });

  it('records a doubles match with 4 eligible participants', async () => {
    const match = await recordMatch({
      ...baseInput,
      modality: 'DOBLES',
      participantsA: ['p1', 'p2'],
      participantsB: ['p3', 'p4'],
    });
    expect(match.participantsA).toEqual(['p1', 'p2']);
    expect(match.participantsB).toEqual(['p3', 'p4']);
  });

  it('throws SeasonNotFound for an unknown seasonId', async () => {
    await expect(recordMatch({ ...baseInput, seasonId: 'nonexistent' })).rejects.toThrow(
      SeasonNotFound,
    );
  });

  it('throws InvalidSeasonState when the season is CLOSED', async () => {
    seedOpenSeason(seasonRepository, {
      id: 'season-2',
      status: 'CLOSED',
      closedAt: new Date('2026-02-01'),
      closedBy: 'admin-1',
    });
    await expect(recordMatch({ ...baseInput, seasonId: 'season-2' })).rejects.toThrow(
      InvalidSeasonState,
    );
  });

  it('throws PlayerNotEligible when a participant does not hold JUGADOR, without touching the repository', async () => {
    await expect(recordMatch({ ...baseInput, participantsB: ['not-a-player'] })).rejects.toThrow(
      PlayerNotEligible,
    );
    expect(
      await competitionMatchRepository.list({
        seasonId: 'season-1',
        category: 'CUARTA',
        modality: 'SINGLES',
      }),
    ).toHaveLength(0);
  });

  it('propagates domain validation errors (e.g. wrong participant count) unchanged', async () => {
    await expect(recordMatch({ ...baseInput, participantsA: ['p1', 'p3'] })).rejects.toThrow(
      InvalidParticipantCount,
    );
  });
});
