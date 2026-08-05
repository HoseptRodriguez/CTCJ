import { CoachingError } from './CoachingError.js';

/** Thrown by createNote when the target userId doesn't hold JUGADOR. */
export class PlayerNotEligible extends CoachingError {
  constructor() {
    super(
      'player_not_eligible',
      'This user does not hold the Jugador role, no note can be created about them.',
    );
  }
}
