import { beforeEach, describe, expect, it } from 'vitest';

import { createRecordMatchResult } from '../../../../src/modules/tournament/application/useCases/recordMatchResult.js';
import { MatchNotFound } from '../../../../src/modules/tournament/application/errors/MatchNotFound.js';
import { MatchNotReady } from '../../../../src/modules/tournament/application/errors/MatchNotReady.js';
import { MatchAlreadyRecorded } from '../../../../src/modules/tournament/application/errors/MatchAlreadyRecorded.js';
import { InvalidWinnerParticipant } from '../../../../src/modules/tournament/domain/errors/InvalidWinnerParticipant.js';
import { InvalidTournamentState } from '../../../../src/modules/tournament/domain/errors/InvalidTournamentState.js';

import { createFakeTournamentRepository, createFakeClock } from './fakes.js';

function seedDrawGenerated(repo, id = 't1') {
  repo._seedTournament({
    id,
    clubId: 'club-1',
    name: 'Torneo',
    category: 'CUARTA',
    modality: 'SINGLES',
    status: 'DRAW_GENERATED',
    drawGeneratedAt: new Date('2026-01-05'),
    createdBy: 'admin-1',
    createdAt: new Date('2026-01-01'),
  });
}

describe('recordMatchResult', () => {
  let tournamentRepository;
  let recordMatchResult;

  beforeEach(() => {
    tournamentRepository = createFakeTournamentRepository();
    recordMatchResult = createRecordMatchResult({
      tournamentRepository,
      clock: createFakeClock(new Date('2026-01-10')),
    });
  });

  it('records a result and propagates the winner into the next round slot', async () => {
    seedDrawGenerated(tournamentRepository);
    tournamentRepository._seedMatch({
      id: 'm1',
      tournamentId: 't1',
      round: 1,
      slot: 0,
      participantAId: 'A',
      participantBId: 'B',
    });
    tournamentRepository._seedMatch({
      id: 'm2',
      tournamentId: 't1',
      round: 1,
      slot: 1,
      participantAId: 'C',
      participantBId: 'D',
    });
    tournamentRepository._seedMatch({
      id: 'final',
      tournamentId: 't1',
      round: 2,
      slot: 0,
      participantAId: null,
      participantBId: null,
    });

    const match = await recordMatchResult({
      matchId: 'm1',
      setsWonA: 2,
      setsWonB: 0,
      winnerSide: 'A',
      playedAt: new Date('2026-01-10'),
      recordedByUserId: 'staff-1',
    });
    expect(match.winnerParticipantId).toBe('A');

    const finalMatch = await tournamentRepository.findMatchById('final');
    expect(finalMatch.participantAId).toBe('A'); // slot 0 -> side A of next match
  });

  it('propagates into side B when the resolved match was at an odd slot', async () => {
    seedDrawGenerated(tournamentRepository);
    tournamentRepository._seedMatch({
      id: 'm1',
      tournamentId: 't1',
      round: 1,
      slot: 1,
      participantAId: 'C',
      participantBId: 'D',
    });
    tournamentRepository._seedMatch({
      id: 'final',
      tournamentId: 't1',
      round: 2,
      slot: 0,
      participantAId: 'A',
      participantBId: null,
    });

    await recordMatchResult({
      matchId: 'm1',
      setsWonA: 0,
      setsWonB: 2,
      winnerSide: 'B',
      playedAt: new Date('2026-01-10'),
      recordedByUserId: 'staff-1',
    });

    const finalMatch = await tournamentRepository.findMatchById('final');
    expect(finalMatch.participantBId).toBe('D');
  });

  it('completes the tournament and sets championId when the final is recorded', async () => {
    seedDrawGenerated(tournamentRepository);
    tournamentRepository._seedMatch({
      id: 'final',
      tournamentId: 't1',
      round: 1,
      slot: 0,
      participantAId: 'A',
      participantBId: 'B',
    });

    await recordMatchResult({
      matchId: 'final',
      setsWonA: 2,
      setsWonB: 1,
      winnerSide: 'A',
      playedAt: new Date('2026-01-10'),
      recordedByUserId: 'staff-1',
    });

    const tournament = await tournamentRepository.findById('t1');
    expect(tournament.status).toBe('COMPLETED');
    expect(tournament.championId).toBe('A');
  });

  it('throws MatchNotFound for an unknown matchId', async () => {
    await expect(
      recordMatchResult({
        matchId: 'nonexistent',
        setsWonA: 2,
        setsWonB: 0,
        winnerSide: 'A',
        playedAt: new Date(),
        recordedByUserId: 'staff-1',
      }),
    ).rejects.toThrow(MatchNotFound);
  });

  it('throws MatchNotReady when a participant slot is still empty', async () => {
    seedDrawGenerated(tournamentRepository);
    tournamentRepository._seedMatch({
      id: 'm1',
      tournamentId: 't1',
      round: 2,
      slot: 0,
      participantAId: 'A',
      participantBId: null,
    });
    await expect(
      recordMatchResult({
        matchId: 'm1',
        setsWonA: 2,
        setsWonB: 0,
        winnerSide: 'A',
        playedAt: new Date(),
        recordedByUserId: 'staff-1',
      }),
    ).rejects.toThrow(MatchNotReady);
  });

  it('throws MatchAlreadyRecorded when the match already has a winner', async () => {
    seedDrawGenerated(tournamentRepository);
    tournamentRepository._seedMatch({
      id: 'm1',
      tournamentId: 't1',
      round: 1,
      slot: 0,
      participantAId: 'A',
      participantBId: 'B',
      winnerParticipantId: 'A',
      setsWonA: 2,
      setsWonB: 0,
    });
    await expect(
      recordMatchResult({
        matchId: 'm1',
        setsWonA: 2,
        setsWonB: 1,
        winnerSide: 'A',
        playedAt: new Date(),
        recordedByUserId: 'staff-1',
      }),
    ).rejects.toThrow(MatchAlreadyRecorded);
  });

  it('throws InvalidWinnerParticipant when winnerSide does not match the higher score', async () => {
    seedDrawGenerated(tournamentRepository);
    tournamentRepository._seedMatch({
      id: 'm1',
      tournamentId: 't1',
      round: 1,
      slot: 0,
      participantAId: 'A',
      participantBId: 'B',
    });
    await expect(
      recordMatchResult({
        matchId: 'm1',
        setsWonA: 0,
        setsWonB: 2,
        winnerSide: 'A',
        playedAt: new Date(),
        recordedByUserId: 'staff-1',
      }),
    ).rejects.toThrow(InvalidWinnerParticipant);
  });

  it('throws InvalidTournamentState when the tournament is not DRAW_GENERATED', async () => {
    tournamentRepository._seedTournament({
      id: 't2',
      clubId: 'club-1',
      name: 'x',
      category: 'CUARTA',
      modality: 'SINGLES',
      status: 'DRAFT',
      createdBy: 'admin-1',
      createdAt: new Date('2026-01-01'),
    });
    tournamentRepository._seedMatch({
      id: 'm1',
      tournamentId: 't2',
      round: 1,
      slot: 0,
      participantAId: 'A',
      participantBId: 'B',
    });
    await expect(
      recordMatchResult({
        matchId: 'm1',
        setsWonA: 2,
        setsWonB: 0,
        winnerSide: 'A',
        playedAt: new Date(),
        recordedByUserId: 'staff-1',
      }),
    ).rejects.toThrow(InvalidTournamentState);
  });
});
