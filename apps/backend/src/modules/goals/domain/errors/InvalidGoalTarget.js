import { DomainError } from './DomainError.js';

/** Thrown when a goal's target shape doesn't match what its metricType
 * requires -- e.g. SKILL_RATING without a targetArea, or a rating outside
 * 1-10. See goalTargetPolicy.js for the validation rules themselves. */
export class InvalidGoalTarget extends DomainError {
  constructor(message) {
    super('invalid_goal_target', message);
  }
}
