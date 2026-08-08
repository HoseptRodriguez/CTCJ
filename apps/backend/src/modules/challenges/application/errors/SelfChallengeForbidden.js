import { DomainError } from '../../domain/errors/DomainError.js';

export class SelfChallengeForbidden extends DomainError {
  constructor() {
    super('self_challenge_forbidden', 'You cannot challenge yourself.');
  }
}
