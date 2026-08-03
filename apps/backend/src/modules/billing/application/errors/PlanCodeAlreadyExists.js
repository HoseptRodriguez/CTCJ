import { DomainError } from '../../domain/errors/DomainError.js';

export class PlanCodeAlreadyExists extends DomainError {
  constructor(code) {
    super('plan_code_already_exists', `A plan with code "${code}" already exists.`);
    this.planCode = code;
  }
}
