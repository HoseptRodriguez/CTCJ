import { randomUUID } from 'node:crypto';

import { CompetitionMatch } from '../../domain/entities/CompetitionMatch.js';
import { SeasonNotFound } from '../errors/SeasonNotFound.js';
import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';

/**
 * @param {{
 *   seasonRepository: import('../ports/SeasonRepository.js').SeasonRepository,
 *   competitionMatchRepository: import('../ports/CompetitionMatchRepository.js').CompetitionMatchRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createRecordMatch({
  seasonRepository,
  competitionMatchRepository,
  playerEligibilityProvider,
  clock,
}) {
  /**
   * @param {{
   *   seasonId: string, category: string, modality: string,
   *   participantsA: string[], participantsB: string[],
   *   winnerSide: string, setsWonA: number, setsWonB: number,
   *   playedAt: Date, notes?: string|null, recordedByUserId: string,
   * }} input
   */
  return async function recordMatch({
    seasonId,
    category,
    modality,
    participantsA,
    participantsB,
    winnerSide,
    setsWonA,
    setsWonB,
    playedAt,
    notes = null,
    recordedByUserId,
  }) {
    const season = await seasonRepository.findById(seasonId);
    if (!season) {
      throw new SeasonNotFound();
    }
    season.assertOpen(); // throws InvalidSeasonState

    const allParticipantIds = [...participantsA, ...participantsB];
    const eligibility = await Promise.all(
      allParticipantIds.map((id) => playerEligibilityProvider.isEligiblePlayer(id)),
    );
    if (eligibility.some((eligible) => !eligible)) {
      throw new PlayerNotEligible();
    }

    const match = CompetitionMatch.record({
      id: randomUUID(),
      seasonId,
      category,
      modality,
      participantsA,
      participantsB,
      winnerSide,
      setsWonA,
      setsWonB,
      playedAt,
      notes,
      recordedBy: recordedByUserId,
      now: clock.now(),
    });

    return competitionMatchRepository.create(match);
  };
}
