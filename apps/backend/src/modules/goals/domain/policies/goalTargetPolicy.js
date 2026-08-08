import { GOAL_METRIC_TYPE, PERFORMANCE_AREAS } from '@ctcj/shared';

import { InvalidGoalTarget } from '../errors/InvalidGoalTarget.js';

/**
 * Validates that a goal's target shape actually matches what its
 * metricType needs before it's ever persisted. Each auto-tracked type maps
 * to a real cross-module data source (see the three provider ports); CUSTOM
 * goals are player-worded and never auto-tracked, so they need nothing
 * beyond a title.
 */
export function validateGoalTarget({ metricType, title, targetArea, targetValue }) {
  if (!title || !title.trim()) {
    throw new InvalidGoalTarget('A goal needs a title.');
  }

  switch (metricType) {
    case GOAL_METRIC_TYPE.SKILL_RATING:
      if (!PERFORMANCE_AREAS.includes(targetArea)) {
        throw new InvalidGoalTarget('SKILL_RATING goals need a valid targetArea.');
      }
      if (!Number.isInteger(targetValue) || targetValue < 1 || targetValue > 10) {
        throw new InvalidGoalTarget('SKILL_RATING goals need a targetValue between 1 and 10.');
      }
      return;
    case GOAL_METRIC_TYPE.MATCH_WINS:
      if (!Number.isInteger(targetValue) || targetValue < 1) {
        throw new InvalidGoalTarget('MATCH_WINS goals need a positive integer targetValue.');
      }
      return;
    case GOAL_METRIC_TYPE.RANKING_POSITION:
      if (!Number.isInteger(targetValue) || targetValue < 1) {
        throw new InvalidGoalTarget('RANKING_POSITION goals need a positive integer targetValue.');
      }
      return;
    case GOAL_METRIC_TYPE.TRAINING_FREQUENCY:
      if (!Number.isInteger(targetValue) || targetValue < 1) {
        throw new InvalidGoalTarget(
          'TRAINING_FREQUENCY goals need a positive integer targetValue (sessions/week).',
        );
      }
      return;
    case GOAL_METRIC_TYPE.CUSTOM:
      return;
    default:
      throw new InvalidGoalTarget(`Unknown metricType: ${metricType}.`);
  }
}
