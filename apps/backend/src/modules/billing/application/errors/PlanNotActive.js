import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by enrollPlayer when the target plan's isActive is false. */
export class PlanNotActive extends DomainError {
  constructor() {
    super('plan_not_active', 'This plan is not active and cannot accept new enrollments.');
  }
}
