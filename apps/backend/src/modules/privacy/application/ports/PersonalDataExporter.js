/**
 * Gathers everything the club keeps about a person, to hand it to them
 * (right of access, Ley 1581 de 2012, art. 8). Read-only.
 */
export class PersonalDataExporter {
  /** @returns {Promise<object>} plain JSON-serializable data */
  async exportFor(_userId) {
    throw new Error('Not implemented');
  }
}
