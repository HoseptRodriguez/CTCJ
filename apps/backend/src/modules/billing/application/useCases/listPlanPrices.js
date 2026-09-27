import { clubToday } from '../../domain/services/priceSchedule.js';
import { PlanNotFound } from '../errors/PlanNotFound.js';

/**
 * A plan's price history, newest first: each price with the one it
 * replaced, who set it, when, and whether it is past, in effect or still
 * waiting to start -- the place where "a price change never alters what was
 * billed" can be checked from the UI.
 *
 * @param {{
 *   planRepository: import('../ports/PlanRepository.js').PlanRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createListPlanPrices({ planRepository, playerDirectoryProvider, clock }) {
  /**
   * @param {{ planId: string }} input
   */
  return async function listPlanPrices({ planId }) {
    const plan = await planRepository.findById(planId);
    if (!plan) {
      throw new PlanNotFound();
    }
    const today = clubToday(clock.now());
    const oldestFirst = (await planRepository.listPrices(planId))
      .slice()
      .sort((a, b) => a.validFrom - b.validFrom);
    const people = await playerDirectoryProvider.getPlayerSummaries([
      ...new Set(oldestFirst.map((p) => p.createdBy)),
    ]);

    return oldestFirst
      .map((price, i) => {
        const who = people.get(price.createdBy);
        let state = 'PAST';
        if (price.validFrom > today) state = 'SCHEDULED';
        else if (price.validTo == null || price.validTo > today) state = 'CURRENT';
        return {
          ...price,
          previousPriceCop: i > 0 ? oldestFirst[i - 1].basePriceCop : null,
          changedByName: who ? `${who.firstName} ${who.lastName}`.trim() : null,
          state,
        };
      })
      .reverse();
  };
}
