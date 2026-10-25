import { DomainError } from '../../domain/errors/DomainError.js';

export class NoScheduledPrice extends DomainError {
  constructor() {
    super('no_scheduled_price', 'This plan has no price change waiting to start.');
  }
}
