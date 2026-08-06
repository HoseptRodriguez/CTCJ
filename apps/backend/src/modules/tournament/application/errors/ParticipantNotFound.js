import { DomainError } from '../../domain/errors/DomainError.js';

export class ParticipantNotFound extends DomainError {
  constructor() {
    super('participant_not_found', 'No participant exists with that id in this tournament.');
  }
}
