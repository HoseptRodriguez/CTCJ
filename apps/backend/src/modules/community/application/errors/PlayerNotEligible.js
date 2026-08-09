import { CommunityError } from './CommunityError.js';

/** Thrown when the caller doesn't hold JUGADOR -- posting/commenting/
 * liking/reporting are all JUGADOR-only, matching challenges'/goals'
 * identical precedent. */
export class PlayerNotEligible extends CommunityError {
  constructor() {
    super('player_not_eligible', 'You must hold the Jugador role to use community features.');
  }
}
