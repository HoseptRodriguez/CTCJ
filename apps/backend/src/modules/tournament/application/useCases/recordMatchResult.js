import { TournamentNotFound } from '../errors/TournamentNotFound.js';
import { MatchNotFound } from '../errors/MatchNotFound.js';
import { MatchNotReady } from '../errors/MatchNotReady.js';
import { MatchAlreadyRecorded } from '../errors/MatchAlreadyRecorded.js';
import { InvalidWinnerParticipant } from '../../domain/errors/InvalidWinnerParticipant.js';

function resolveWinnerParticipantId({ match, winnerSide, setsWonA, setsWonB }) {
  if (winnerSide !== 'A' && winnerSide !== 'B') {
    throw new InvalidWinnerParticipant(winnerSide);
  }
  const winnerSets = winnerSide === 'A' ? setsWonA : setsWonB;
  const loserSets = winnerSide === 'A' ? setsWonB : setsWonA;
  if (winnerSets <= loserSets) {
    throw new InvalidWinnerParticipant(winnerSide);
  }
  return winnerSide === 'A' ? match.participantAId : match.participantBId;
}

/**
 * @param {{
 *   tournamentRepository: import('../ports/TournamentRepository.js').TournamentRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createRecordMatchResult({ tournamentRepository, clock }) {
  /**
   * @param {{ matchId: string, setsWonA: number, setsWonB: number, winnerSide: 'A'|'B',
   *   playedAt: Date, notes?: string|null, recordedByUserId: string }} input
   */
  return async function recordMatchResult({
    matchId,
    setsWonA,
    setsWonB,
    winnerSide,
    playedAt,
    notes = null,
    recordedByUserId,
  }) {
    const match = await tournamentRepository.findMatchById(matchId);
    if (!match) {
      throw new MatchNotFound();
    }

    const tournament = await tournamentRepository.findById(match.tournamentId);
    if (!tournament) {
      throw new TournamentNotFound();
    }
    tournament.assertDrawGenerated('recordMatchResult'); // throws InvalidTournamentState

    if (match.participantAId == null || match.participantBId == null) {
      throw new MatchNotReady();
    }
    if (match.winnerParticipantId != null) {
      throw new MatchAlreadyRecorded();
    }

    const winnerParticipantId = resolveWinnerParticipantId({
      match,
      winnerSide,
      setsWonA,
      setsWonB,
    }); // throws InvalidWinnerParticipant

    const allMatches = await tournamentRepository.listMatches(tournament.id);
    const nextRound = match.round + 1;
    const nextSlot = Math.floor(match.slot / 2);
    const nextMatch = allMatches.find((m) => m.round === nextRound && m.slot === nextSlot);

    if (nextMatch) {
      return tournamentRepository.saveMatchResult({
        matchId,
        setsWonA,
        setsWonB,
        winnerParticipantId,
        recordedBy: recordedByUserId,
        playedAt,
        notes,
        propagateTo: { matchId: nextMatch.id, side: match.slot % 2 === 0 ? 'A' : 'B' },
        tournament: null,
      });
    }

    // No next match -- this was the final.
    tournament.complete({ championId: winnerParticipantId, now: clock.now() });
    return tournamentRepository.saveMatchResult({
      matchId,
      setsWonA,
      setsWonB,
      winnerParticipantId,
      recordedBy: recordedByUserId,
      playedAt,
      notes,
      propagateTo: null,
      tournament,
    });
  };
}
