import { DomainError } from '../../domain/errors/DomainError.js';

export class PlanNotFound extends DomainError {
  constructor() {
    super('plan_not_found', 'Membership plan not found.');
  }
}
