import { DomainError } from '../../domain/errors/DomainError.js';

/** A minor's account can't book until a guardian links it and authorizes the minor's data and image. */
export class MinorPendingGuardianAuthorization extends DomainError {
  constructor() {
    super(
      'minor_pending_guardian_authorization',
      "A minor's account needs the guardian's authorization before booking.",
    );
  }
}
