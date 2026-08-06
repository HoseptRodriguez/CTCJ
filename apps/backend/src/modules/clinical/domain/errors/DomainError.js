/** Base class for all clinical domain errors. Carries a stable `code` for
 * the HTTP-layer problem-detail mapping (infrastructure/http), never a
 * message the domain expects to be shown to end users verbatim. */
export class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}
