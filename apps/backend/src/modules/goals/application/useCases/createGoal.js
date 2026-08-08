import { randomUUID } from 'node:crypto';

import { Goal } from '../../domain/entities/Goal.js';
import { validateGoalTarget } from '../../domain/policies/goalTargetPolicy.js';

/**
 * @param {{
 *   goalRepository: import('../ports/GoalRepository.js').GoalRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCreateGoal({ goalRepository, clock }) {
  /**
   * @param {{ playerId: string, title: string, metricType: string, targetArea?: string, targetValue?: number, targetCategory?: string, targetModality?: string }} input
   */
  return async function createGoal({
    playerId,
    title,
    metricType,
    targetArea,
    targetValue,
    targetCategory,
    targetModality,
  }) {
    validateGoalTarget({ metricType, title, targetArea, targetValue }); // throws InvalidGoalTarget

    const goal = Goal.create({
      id: randomUUID(),
      playerId,
      title: title.trim(),
      metricType,
      targetArea: targetArea ?? null,
      targetValue: targetValue ?? null,
      targetCategory: targetCategory ?? null,
      targetModality: targetModality ?? null,
      now: clock.now(),
    });

    return goalRepository.create(goal);
  };
}
