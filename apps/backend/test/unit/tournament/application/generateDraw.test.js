import { beforeEach, describe, expect, it } from 'vitest';

import { createGenerateDraw } from '../../../../src/modules/tournament/application/useCases/generateDraw.js';
import { NotEnoughParticipants } from '../../../../src/modules/tournament/domain/errors/NotEnoughParticipants.js';
import { InvalidTournamentState } from '../../../../src/modules/tournament/domain/errors/InvalidTournamentState.js';

import {
  createFakeTournamentRepository,
  createFakeStandingsProvider,
  createFakeClock,
} from './fakes.js';

function seedDraft(repo, id = 't1', overrides = {}) {
  repo._seedTournament({
    id,
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

describe('generateDraw', () => {
  let tournamentRepository;

  beforeEach(() => {
    tournamentRepository = createFakeTournamentRepository();
    seedDraft(tournamentRepository);
  });

  function build(standingsRows = []) {
    return createGenerateDraw({
      tournamentRepository,
      standingsProvider: createFakeStandingsProvider(standingsRows),
      clock: createFakeClock(new Date('2026-02-01')),
    });
  }

  it('seeds participants by standings points (highest first) and generates a bracket', async () => {
    tournamentRepository._seedParticipant({
      id: 'A',
      tournamentId: 't1',
      playerIds: ['low'],
      registeredAt: new Date('2026-01-02'),
    });
    tournamentRepository._seedParticipant({
      id: 'B',
      tournamentId: 't1',
      playerIds: ['high'],
      registeredAt: new Date('2026-01-03'),
    });
    const generateDraw = build([
      { playerId: 'low', points: 2 },
      { playerId: 'high', points: 10 },
    ]);

    const tournament = await generateDraw({ tournamentId: 't1' });
    expect(tournament.status).toBe('DRAW_GENERATED');

    const participants = await tournamentRepository.listParticipants('t1');
    const high = participants.find((p) => p.id === 'B');
    const low = participants.find((p) => p.id === 'A');
    expect(high.seed).toBe(1); // higher points -> seed 1
    expect(low.seed).toBe(2);

    const matches = await tournamentRepository.listMatches('t1');
    expect(matches).toHaveLength(1); // 2 participants -> single final match
    expect([matches[0].participantAId, matches[0].participantBId].sort()).toEqual(
      ['A', 'B'].sort(),
    );
  });

  it('sums doubles pair points for seeding', async () => {
    tournamentRepository._seedParticipant({
      id: 'pair1',
      tournamentId: 't1',
      playerIds: ['a', 'b'],
      registeredAt: new Date('2026-01-02'),
    });
    tournamentRepository._seedParticipant({
      id: 'pair2',
      tournamentId: 't1',
      playerIds: ['c', 'd'],
      registeredAt: new Date('2026-01-03'),
    });
    const generateDraw = build([
      { playerId: 'a', points: 2 },
      { playerId: 'b', points: 2 }, // pair1 sum = 4
      { playerId: 'c', points: 3 },
      { playerId: 'd', points: 4 }, // pair2 sum = 7
    ]);

    await generateDraw({ tournamentId: 't1' });
    const participants = await tournamentRepository.listParticipants('t1');
    expect(participants.find((p) => p.id === 'pair2').seed).toBe(1);
    expect(participants.find((p) => p.id === 'pair1').seed).toBe(2);
  });

  it('treats unranked players as 0 points and breaks ties by registration order', async () => {
    tournamentRepository._seedParticipant({
      id: 'first',
      tournamentId: 't1',
      playerIds: ['x'],
      registeredAt: new Date('2026-01-02T00:00:00Z'),
    });
    tournamentRepository._seedParticipant({
      id: 'second',
      tournamentId: 't1',
      playerIds: ['y'],
      registeredAt: new Date('2026-01-02T01:00:00Z'),
    });
    const generateDraw = build([]); // no standings data at all -- fully degraded

    await generateDraw({ tournamentId: 't1' });
    const participants = await tournamentRepository.listParticipants('t1');
    expect(participants.find((p) => p.id === 'first').seed).toBe(1);
    expect(participants.find((p) => p.id === 'second').seed).toBe(2);
  });

  it('throws NotEnoughParticipants with fewer than 2 registered', async () => {
    tournamentRepository._seedParticipant({ id: 'only', tournamentId: 't1', playerIds: ['x'] });
    const generateDraw = build([]);
    await expect(generateDraw({ tournamentId: 't1' })).rejects.toThrow(NotEnoughParticipants);
  });

  it('throws InvalidTournamentState when the draw was already generated', async () => {
    seedDraft(tournamentRepository, 't2', {
      status: 'DRAW_GENERATED',
      drawGeneratedAt: new Date(),
    });
    tournamentRepository._seedParticipant({ id: 'p1', tournamentId: 't2', playerIds: ['x'] });
    tournamentRepository._seedParticipant({ id: 'p2', tournamentId: 't2', playerIds: ['y'] });
    const generateDraw = build([]);
    await expect(generateDraw({ tournamentId: 't2' })).rejects.toThrow(InvalidTournamentState);
  });
});
