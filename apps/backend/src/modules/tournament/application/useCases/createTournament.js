import { randomUUID } from 'node:crypto';

import { Tournament } from '../../domain/entities/Tournament.js';

/**
 * @param {{
 *   tournamentRepository: import('../ports/TournamentRepository.js').TournamentRepository,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 * }} deps
 */
export function createCreateTournament({ tournamentRepository, clock, clubId }) {
  /** @param {{ name: string, category: string, modality: string, createdByUserId: string }} input */
  return async function createTournament({ name, category, modality, createdByUserId }) {
    const tournament = Tournament.create({
      id: randomUUID(),
      clubId,
      name,
      category,
      modality,
      createdBy: createdByUserId,
      now: clock.now(),
    });

    return tournamentRepository.create(tournament);
  };
}
