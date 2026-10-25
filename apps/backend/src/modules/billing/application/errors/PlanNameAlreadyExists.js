import { DomainError } from '../../domain/errors/DomainError.js';

export class PlanNameAlreadyExists extends DomainError {
  constructor(name) {
    super('plan_name_already_exists', `A plan named "${name}" already exists.`);
    this.planName = name;
  }
}
