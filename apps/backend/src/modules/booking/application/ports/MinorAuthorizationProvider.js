/**
 * Booking's narrow view of identity's rule: a minor's account can't book
 * until a guardian links it and authorizes the minor's data and image.
 */
export class MinorAuthorizationProvider {
  /** @returns {Promise<boolean>} */
  async isPendingGuardianAuthorization(_userId) {
    throw new Error('Not implemented');
  }
}
