import { DomainError } from '../../domain/errors/DomainError.js';

export class MedicalHistoryEntryNotFound extends DomainError {
  constructor() {
    super('medical_history_entry_not_found', 'No medical history entry exists with that id.');
  }
}
