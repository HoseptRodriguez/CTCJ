/** Base class for all coaching application errors. Carries a stable `code`
 * for the HTTP-layer problem-detail mapping (infrastructure/http), never a
 * message the caller expects to be shown to end users verbatim. No separate
 * domain/errors/ layer here -- coaching has no state-transition logic of its
 * own (append-only notes, no entity behavior to encode), so this lives
 * directly under application/. */
export class CoachingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}
