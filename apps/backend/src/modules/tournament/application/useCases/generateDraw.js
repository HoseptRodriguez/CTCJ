import { generateBracket } from '../../domain/services/generateBracket.js';
import { TournamentNotFound } from '../errors/TournamentNotFound.js';

/**
 * Seeds each participant by the sum of its members' current standings
 * points for the tournament's (category, modality) -- an unranked player
 * (never played a competition match in that category+modality, or no OPEN
 * season exists at all) contributes 0. Ties are broken by registration
 * order (earliest first), a stable, deterministic fallback that degrades
 * gracefully to pure registration order when no standings data exists at
 * all (e.g. no OPEN competition season).
 *
 * @param {{
 *   tournamentRepository: import('../ports/TournamentRepository.js').TournamentRepository,
 *   standingsProvider: import('../ports/StandingsProvider.js').StandingsProvider,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createGenerateDraw({ tournamentRepository, standingsProvider, clock }) {
  /** @param {{ tournamentId: string }} input */
  return async function generateDraw({ tournamentId }) {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new TournamentNotFound();
    }

    const participants = await tournamentRepository.listParticipants(tournamentId);
    tournament.generateDraw({ participantCount: participants.length, now: clock.now() }); // throws NotEnoughParticipants/InvalidTournamentState

    const standings = await standingsProvider.getCurrentStandings({
      category: tournament.category,
      modality: tournament.modality,
    });
    const pointsByPlayer = new Map(standings.map((row) => [row.playerId, row.points]));

    const ranked = participants
      .map((p) => ({
        ...p,
        seedValue: p.playerIds.reduce(
          (sum, playerId) => sum + (pointsByPlayer.get(playerId) ?? 0),
          0,
        ),
      }))
      .sort((a, b) => {
        if (b.seedValue !== a.seedValue) return b.seedValue - a.seedValue;
        return a.registeredAt - b.registeredAt;
      });

    const seeds = ranked.map((p, index) => ({ participantId: p.id, seed: index + 1 }));
    const { matches } = generateBracket(ranked.map((p) => p.id));

    return tournamentRepository.saveBracket({ tournament, seeds, matches });
  };
}
