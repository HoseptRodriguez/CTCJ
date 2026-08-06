import { DomainError } from '../../domain/errors/DomainError.js';

export class RecoveryPlanNotFound extends DomainError {
  constructor() {
    super('recovery_plan_not_found', 'No recovery plan exists with that id.');
  }
}
