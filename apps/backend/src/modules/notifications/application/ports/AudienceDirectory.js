/** Players of a competition category and of a tournament (other modules). */
export class AudienceDirectory {
  /** { category } -> string[] */
  async playerIdsInCategory(_input) {
    throw new Error('Not implemented');
  }

  /** { tournamentId } -> string[] */
  async playerIdsInTournament(_input) {
    throw new Error('Not implemented');
  }

  /** { tournamentId } -> string|null */
  async tournamentName(_input) {
    throw new Error('Not implemented');
  }
}
