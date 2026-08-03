import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown when a user tries to request guardianship over themselves. Same shape as SelfAssignmentForbidden. */
export class GuardianshipSelfLinkForbidden extends DomainError {
  constructor() {
    super('guardianship_self_link_forbidden', 'You cannot request guardianship over yourself.');
  }
}
