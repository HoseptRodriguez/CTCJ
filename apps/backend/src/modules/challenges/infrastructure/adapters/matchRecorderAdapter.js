import { PlayerNotEligible } from '../../application/errors/PlayerNotEligible.js';
import { MatchRecordingUnavailable } from '../../application/errors/MatchRecordingUnavailable.js';

/**
 * The one place challenges' infrastructure is allowed to know the
 * competition module exists. Imports competition's application layer (a
 * plain use-case function), never its persistence -- legal under
 * .dependency-cruiser.js's rules, same shape as notificationSenderAdapter.js:
 * accept the already-built use-case function as a dependency, app.js wires
 * `competitionContainer.recordMatchForOpenSeason` in directly (patched
 * onto challengesContainer after competitionContainer builds, since
 * challenges is built first -- see app.js).
 *
 * Also the boundary where competition's own DomainError codes get
 * translated into challenges' own error classes, so no foreign
 * DomainError subclass ever crosses the module boundary -- both codes
 * handled here are genuinely plausible at confirmation time (a lapsed
 * closed season, a player whose JUGADOR role lapsed since accepting).
 * Anything else rethrows as-is.
 *
 * @param {{ recordMatchForOpenSeason: (input: object) => Promise<{id: string}> }} deps
 * @returns {import('../../application/ports/MatchRecorder.js').MatchRecorder}
 */
export function createMatchRecorderAdapter({ recordMatchForOpenSeason }) {
  return {
    async recordConfirmedMatch(input) {
      try {
        return await recordMatchForOpenSeason(input);
      } catch (err) {
        if (err?.code === 'no_open_season') {
          throw new MatchRecordingUnavailable();
        }
        if (err?.code === 'player_not_eligible') {
          throw new PlayerNotEligible();
        }
        throw err;
      }
    },
  };
}
