/** A signed "form loaded at" stamp, so a bot can't fake the filling time. */
export class FormTokenService {
  /** @returns {string} */
  issue(_now) {
    throw new Error('Not implemented');
  }

  /** @returns {Date|null} when it was issued, or null if forged or malformed */
  verify(_token) {
    throw new Error('Not implemented');
  }
}
