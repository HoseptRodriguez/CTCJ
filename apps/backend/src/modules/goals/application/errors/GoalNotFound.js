import { DomainError } from '../../domain/errors/DomainError.js';

/** Also thrown when a goal exists but belongs to someone else -- a goal
 * only ever exists from its own owner's point of view, matching how
 * password reset avoids revealing whether an email exists. No separate
 * "forbidden" error for a goal that belongs to someone else. */
export class GoalNotFound extends DomainError {
  constructor() {
    super('goal_not_found', 'No goal exists with that id.');
  }
}
