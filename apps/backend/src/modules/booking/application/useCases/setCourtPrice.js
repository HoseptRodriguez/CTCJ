import { CourtNotFound } from '../errors/CourtNotFound.js';

/**
 * @param {{
 *   courtRepository: import('../ports/CourtRepository.js').CourtRepository,
 *   clubId: string,
 * }} deps
 */
export function createSetCourtPrice({ courtRepository, clubId }) {
  /**
   * @param {{ courtId: string, priceCop: number }} input
   */
  return async function setCourtPrice({ courtId, priceCop }) {
    const court = await courtRepository.setPrice(clubId, courtId, priceCop);
    if (!court) {
      throw new CourtNotFound();
    }
    return { courtId: court.id, priceCop: court.priceCop };
  };
}
