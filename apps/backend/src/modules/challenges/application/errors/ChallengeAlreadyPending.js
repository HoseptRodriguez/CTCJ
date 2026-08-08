import { DomainError } from '../../domain/errors/DomainError.js';

export class ChallengeAlreadyPending extends DomainError {
  constructor() {
    super(
      'challenge_already_pending',
      'There is already a pending challenge between these players.',
    );
  }
}
