import { MatchNotFound } from '../errors/MatchNotFound.js';

/**
 * @param {{
 *   competitionMatchRepository: import('../ports/CompetitionMatchRepository.js').CompetitionMatchRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createVoidMatch({ competitionMatchRepository, clock }) {
  /** @param {{ matchId: string, reason: string, voidedByUserId: string }} input */
  return async function voidMatch({ matchId, reason, voidedByUserId }) {
    const match = await competitionMatchRepository.findById(matchId);
    if (!match) {
      throw new MatchNotFound();
    }

    match.voidOut({ reason, voidedBy: voidedByUserId, now: clock.now() }); // throws InvalidMatchState

    return competitionMatchRepository.update(match);
  };
}
