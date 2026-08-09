/** Base class for all community application errors. Carries a stable `code`
 * for the HTTP-layer problem-detail mapping (infrastructure/http), never a
 * message the caller expects to be shown to end users verbatim. No separate
 * domain/errors/ layer here -- posts/comments/likes/reports have no
 * state-transition logic of their own (a post/comment either exists or is
 * deleted, a like is a toggle, a report is pending-or-dismissed with no
 * branching transitions worth modeling), matching notifications'/coaching's
 * identical precedent. */
export class CommunityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}
