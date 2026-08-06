import { beforeEach, describe, expect, it } from 'vitest';

import { createRemoveParticipant } from '../../../../src/modules/tournament/application/useCases/removeParticipant.js';
import { ParticipantNotFound } from '../../../../src/modules/tournament/application/errors/ParticipantNotFound.js';
import { InvalidTournamentState } from '../../../../src/modules/tournament/domain/errors/InvalidTournamentState.js';

import { createFakeTournamentRepository } from './fakes.js';

describe('removeParticipant', () => {
  let tournamentRepository;
  let removeParticipant;

  beforeEach(() => {
    tournamentRepository = createFakeTournamentRepository();
    tournamentRepository._seedTournament({
      id: 't1',
      clubId: 'club-1',
      name: 'Torneo',
      category: 'CUARTA',
      modality: 'SINGLES',
      status: 'DRAFT',
      createdBy: 'admin-1',
      createdAt: new Date('2026-01-01'),
    });
    tournamentRepository._seedParticipant({ id: 'part-1', tournamentId: 't1', playerIds: ['p1'] });
    removeParticipant = createRemoveParticipant({ tournamentRepository });
  });

  it('removes a participant while DRAFT', async () => {
    await removeParticipant({ tournamentId: 't1', participantId: 'part-1' });
    const remaining = await tournamentRepository.listParticipants('t1');
    expect(remaining).toHaveLength(0);
  });

  it('throws ParticipantNotFound for an unknown participantId', async () => {
    await expect(
      removeParticipant({ tournamentId: 't1', participantId: 'nonexistent' }),
    ).rejects.toThrow(ParticipantNotFound);
  });

  it('throws InvalidTournamentState once the draw has been generated', async () => {
    tournamentRepository._seedTournament({
      id: 't2',
      clubId: 'club-1',
      name: 'Torneo 2',
      category: 'CUARTA',
      modality: 'SINGLES',
      status: 'DRAW_GENERATED',
      drawGeneratedAt: new Date(),
      createdBy: 'admin-1',
      createdAt: new Date('2026-01-01'),
    });
    tournamentRepository._seedParticipant({ id: 'part-2', tournamentId: 't2', playerIds: ['p1'] });
    await expect(
      removeParticipant({ tournamentId: 't2', participantId: 'part-2' }),
    ).rejects.toThrow(InvalidTournamentState);
  });
});
