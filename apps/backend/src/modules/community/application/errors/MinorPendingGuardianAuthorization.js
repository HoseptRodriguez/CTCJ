import { CommunityError } from './CommunityError.js';

/** A minor's account can't post until a guardian links it and authorizes the minor's data and image. */
export class MinorPendingGuardianAuthorization extends CommunityError {
  constructor() {
    super(
      'minor_pending_guardian_authorization',
      "A minor's account needs the guardian's authorization before posting.",
    );
  }
}
