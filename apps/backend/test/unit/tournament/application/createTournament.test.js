import { beforeEach, describe, expect, it } from 'vitest';

import { createCreateTournament } from '../../../../src/modules/tournament/application/useCases/createTournament.js';

import { createFakeTournamentRepository, createFakeClock } from './fakes.js';

describe('createTournament', () => {
  let tournamentRepository;
  let createTournament;

  beforeEach(() => {
    tournamentRepository = createFakeTournamentRepository();
    createTournament = createCreateTournament({
      tournamentRepository,
      clock: createFakeClock(new Date('2026-01-01')),
      clubId: 'club-1',
    });
  });

  it('creates a DRAFT tournament', async () => {
    const t = await createTournament({
      name: 'Torneo Apertura',
      category: 'CUARTA',
      modality: 'SINGLES',
      createdByUserId: 'admin-1',
    });
    expect(t.status).toBe('DRAFT');
    expect(t.clubId).toBe('club-1');
    expect(t.createdBy).toBe('admin-1');
  });
});
