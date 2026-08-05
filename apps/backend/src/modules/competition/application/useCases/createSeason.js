import { randomUUID } from 'node:crypto';

import { CompetitionSeason } from '../../domain/entities/CompetitionSeason.js';
import { SeasonAlreadyOpen } from '../errors/SeasonAlreadyOpen.js';

/**
 * @param {{
 *   seasonRepository: import('../ports/SeasonRepository.js').SeasonRepository,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 * }} deps
 */
export function createCreateSeason({ seasonRepository, clock, clubId }) {
  /** @param {{ name: string, year: number, seasonNumber: number, startDate: Date, createdByUserId: string }} input */
  return async function createSeason({ name, year, seasonNumber, startDate, createdByUserId }) {
    const existingOpen = await seasonRepository.findOpenByClub(clubId);
    if (existingOpen) {
      throw new SeasonAlreadyOpen();
    }

    const season = CompetitionSeason.create({
      id: randomUUID(),
      clubId,
      name,
      year,
      seasonNumber,
      startDate,
      createdBy: createdByUserId,
      now: clock.now(),
    });

    return seasonRepository.create(season);
  };
}
