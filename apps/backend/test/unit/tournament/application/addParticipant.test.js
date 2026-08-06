import { beforeEach, describe, expect, it } from 'vitest';

import { createAddParticipant } from '../../../../src/modules/tournament/application/useCases/addParticipant.js';
import { PlayerNotEligible } from '../../../../src/modules/tournament/application/errors/PlayerNotEligible.js';
import { PlayerAlreadyRegistered } from '../../../../src/modules/tournament/application/errors/PlayerAlreadyRegistered.js';
import { ParticipantCountMismatch } from '../../../../src/modules/tournament/application/errors/ParticipantCountMismatch.js';
import { TournamentNotFound } from '../../../../src/modules/tournament/application/errors/TournamentNotFound.js';
import { InvalidTournamentState } from '../../../../src/modules/tournament/domain/errors/InvalidTournamentState.js';

import { createFakeTournamentRepository, createFakePlayerEligibilityProvider } from './fakes.js';

function seedDraftTournament(repo, overrides = {}) {
  repo._seedTournament({
    id: 't1',
    clubId: 'club-1',
    name: 'Torneo',
    category: 'CUARTA',
    modality: 'SINGLES',
    status: 'DRAFT',
    createdBy: 'admin-1',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  });
}

describe('addParticipant', () => {
  let tournamentRepository;
  let addParticipant;

  beforeEach(() => {
    tournamentRepository = createFakeTournamentRepository();
    seedDraftTournament(tournamentRepository);
    addParticipant = createAddParticipant({
      tournamentRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['p1', 'p2', 'p3'])),
    });
  });

  it('registers a single-player SINGLES entry', async () => {
    const participant = await addParticipant({
      tournamentId: 't1',
      playerIds: ['p1'],
      registeredByUserId: 'admin-1',
    });
    expect(participant.playerIds).toEqual(['p1']);
  });

  it('registers a 2-player DOBLES entry', async () => {
    seedDraftTournament(tournamentRepository, { id: 't-dobles', modality: 'DOBLES' });
    const participant = await addParticipant({
      tournamentId: 't-dobles',
      playerIds: ['p1', 'p2'],
      registeredByUserId: 'admin-1',
    });
    expect(participant.playerIds).toEqual(['p1', 'p2']);
  });

  it('throws TournamentNotFound for an unknown tournamentId', async () => {
    await expect(
      addParticipant({
        tournamentId: 'nonexistent',
        playerIds: ['p1'],
        registeredByUserId: 'admin-1',
      }),
    ).rejects.toThrow(TournamentNotFound);
  });

  it('throws InvalidTournamentState once the draw has been generated', async () => {
    seedDraftTournament(tournamentRepository, {
      id: 't2',
      status: 'DRAW_GENERATED',
      drawGeneratedAt: new Date(),
    });
    await expect(
      addParticipant({ tournamentId: 't2', playerIds: ['p1'], registeredByUserId: 'admin-1' }),
    ).rejects.toThrow(InvalidTournamentState);
  });

  it('throws ParticipantCountMismatch for a SINGLES tournament given 2 players', async () => {
    await expect(
      addParticipant({
        tournamentId: 't1',
        playerIds: ['p1', 'p2'],
        registeredByUserId: 'admin-1',
      }),
    ).rejects.toThrow(ParticipantCountMismatch);
  });

  it('throws ParticipantCountMismatch for a DOBLES tournament given 1 player', async () => {
    seedDraftTournament(tournamentRepository, { id: 't3', modality: 'DOBLES' });
    await expect(
      addParticipant({ tournamentId: 't3', playerIds: ['p1'], registeredByUserId: 'admin-1' }),
    ).rejects.toThrow(ParticipantCountMismatch);
  });

  it('throws PlayerNotEligible when a member does not hold JUGADOR', async () => {
    await expect(
      addParticipant({
        tournamentId: 't1',
        playerIds: ['not-a-player'],
        registeredByUserId: 'admin-1',
      }),
    ).rejects.toThrow(PlayerNotEligible);
  });

  it('throws PlayerAlreadyRegistered when a player is already in this tournament', async () => {
    await addParticipant({ tournamentId: 't1', playerIds: ['p1'], registeredByUserId: 'admin-1' });
    await expect(
      addParticipant({ tournamentId: 't1', playerIds: ['p1'], registeredByUserId: 'admin-1' }),
    ).rejects.toThrow(PlayerAlreadyRegistered);
  });

  it('throws PlayerAlreadyRegistered when a player is already half of a registered doubles pair', async () => {
    seedDraftTournament(tournamentRepository, { id: 't-dobles-2', modality: 'DOBLES' });
    await addParticipant({
      tournamentId: 't-dobles-2',
      playerIds: ['p1', 'p2'],
      registeredByUserId: 'admin-1',
    });
    await expect(
      addParticipant({
        tournamentId: 't-dobles-2',
        playerIds: ['p1', 'p3'],
        registeredByUserId: 'admin-1',
      }),
    ).rejects.toThrow(PlayerAlreadyRegistered);
  });
});
