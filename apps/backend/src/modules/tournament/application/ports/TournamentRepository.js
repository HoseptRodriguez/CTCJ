/**
 * @typedef {import('../../domain/entities/Tournament.js').Tournament} Tournament
 * @typedef {{ id: string, playerIds: string[], seed: number|null, registeredAt: Date }} ParticipantRow
 * @typedef {{ id: string, round: number, slot: number, participantAId: string|null, participantBId: string|null,
 *   setsWonA: number|null, setsWonB: number|null, winnerParticipantId: string|null, playedAt: Date|null,
 *   recordedBy: string|null, notes: string|null }} MatchRow
 */
export class TournamentRepository {
  /** @returns {Promise<Tournament>} */
  async create(_tournament) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Tournament|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Persists status/timestamp/championId changes made via the domain entity's transition methods. @returns {Promise<Tournament>} */
  async update(_tournament) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Tournament[]>} newest first, no participant/match detail -- bare list */
  async listByClub(_clubId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<ParticipantRow>} */
  async addParticipant(_input) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<void>} */
  async removeParticipant(_participantId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<ParticipantRow[]>} */
  async listParticipants(_tournamentId) {
    throw new Error('Not implemented');
  }

  /**
   * Persists the full generated bracket transactionally: the tournament's
   * DRAFT->DRAW_GENERATED transition, every participant's assigned seed,
   * and every round's match rows (round-1 byes pre-resolved, their winners
   * already propagated into round 2) -- all in one DB transaction.
   * @param {{ tournament: Tournament, seeds: Array<{ participantId: string, seed: number }>, matches: Array<object> }} input
   * @returns {Promise<Tournament>}
   */
  async saveBracket(_input) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<MatchRow|null>} */
  async findMatchById(_matchId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<MatchRow[]>} every match in the bracket, round then slot ascending */
  async listMatches(_tournamentId) {
    throw new Error('Not implemented');
  }

  /**
   * Persists a match result, transactionally, together with whichever of
   * the following applies: propagating the winner into the next round's
   * match slot (`propagateTo`), or completing the tournament (`tournament`
   * present, already transitioned to COMPLETED with championId set) when
   * this was the final match. Exactly one of `propagateTo`/`tournament` is
   * non-null.
   * @param {{ matchId: string, setsWonA: number, setsWonB: number, winnerParticipantId: string,
   *   recordedBy: string, playedAt: Date, notes: string|null, propagateTo: { matchId: string, side: 'A'|'B' }|null,
   *   tournament: Tournament|null }} input
   * @returns {Promise<MatchRow>}
   */
  async saveMatchResult(_input) {
    throw new Error('Not implemented');
  }
}
