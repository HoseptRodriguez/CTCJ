/** Base class for all notifications application errors. Carries a stable
 * `code` for the HTTP-layer problem-detail mapping (infrastructure/http),
 * never a message the caller expects to be shown to end users verbatim. No
 * separate domain/errors/ layer here -- notifications have no state-
 * transition logic of its own (create + idempotent mark-read, no illegal
 * transitions to guard), matching coaching's identical precedent. */
export class NotificationsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}
