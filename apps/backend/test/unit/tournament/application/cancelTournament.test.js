import { beforeEach, describe, expect, it } from 'vitest';

import { createCancelTournament } from '../../../../src/modules/tournament/application/useCases/cancelTournament.js';
import { TournamentNotFound } from '../../../../src/modules/tournament/application/errors/TournamentNotFound.js';
import { InvalidTournamentState } from '../../../../src/modules/tournament/domain/errors/InvalidTournamentState.js';

import { createFakeTournamentRepository, createFakeClock } from './fakes.js';

describe('cancelTournament', () => {
  let tournamentRepository;
  let cancelTournament;

  beforeEach(() => {
    tournamentRepository = createFakeTournamentRepository();
    cancelTournament = createCancelTournament({
      tournamentRepository,
      clock: createFakeClock(new Date('2026-01-15')),
    });
  });

  it('cancels a DRAFT tournament', async () => {
    tournamentRepository._seedTournament({
      id: 't1',
      clubId: 'club-1',
      name: 'x',
      category: 'CUARTA',
      modality: 'SINGLES',
      status: 'DRAFT',
      createdBy: 'admin-1',
      createdAt: new Date('2026-01-01'),
    });
    const t = await cancelTournament({ tournamentId: 't1' });
    expect(t.status).toBe('CANCELLED');
  });

  it('throws TournamentNotFound for an unknown id', async () => {
    await expect(cancelTournament({ tournamentId: 'nonexistent' })).rejects.toThrow(
      TournamentNotFound,
    );
  });

  it('throws InvalidTournamentState once COMPLETED', async () => {
    tournamentRepository._seedTournament({
      id: 't2',
      clubId: 'club-1',
      name: 'x',
      category: 'CUARTA',
      modality: 'SINGLES',
      status: 'COMPLETED',
      createdBy: 'admin-1',
      createdAt: new Date('2026-01-01'),
      drawGeneratedAt: new Date('2026-01-02'),
      completedAt: new Date('2026-01-10'),
      championId: 'A',
    });
    await expect(cancelTournament({ tournamentId: 't2' })).rejects.toThrow(InvalidTournamentState);
  });
});
