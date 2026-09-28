/**
 * Whether the player's optional authorization to process their health data
 * (Ley 1581 de 2012, arts. 5 y 6) is in force. Identity keeps the proof;
 * for a minor it's the guardian's. Fails closed.
 */
export class HealthAuthorizationProvider {
  /** @returns {Promise<boolean>} */
  async hasHealthAuthorization(_playerId) {
    throw new Error('Not implemented');
  }
}
