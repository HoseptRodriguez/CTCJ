import { GoalNotFound } from '../errors/GoalNotFound.js';

/**
 * @param {{
 *   goalRepository: import('../ports/GoalRepository.js').GoalRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createAbandonGoal({ goalRepository, clock }) {
  /** @param {{ playerId: string, goalId: string }} input */
  return async function abandonGoal({ playerId, goalId }) {
    const goal = await goalRepository.findById(goalId);
    if (!goal || goal.playerId !== playerId) {
      throw new GoalNotFound();
    }

    goal.abandon(clock.now()); // in-memory guard: throws InvalidGoalState if not ACTIVE
    return goalRepository.update(goal);
  };
}
