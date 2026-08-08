import { CHALLENGE_STATUS } from '@ctcj/shared';

import { InvalidChallengeState } from '../errors/InvalidChallengeState.js';

/**
 * A player-to-player friendly-match proposal. Framework-agnostic by
 * construction: no Express/Prisma imports anywhere in this file (enforced
 * mechanically by .dependency-cruiser.js).
 */
export class Challenge {
  constructor({
    id,
    challengerUserId,
    opponentUserId,
    message = null,
    status = CHALLENGE_STATUS.PENDING,
    createdAt = null,
    respondedAt = null,
    completedAt = null,
  }) {
    this.id = id;
    this.challengerUserId = challengerUserId;
    this.opponentUserId = opponentUserId;
    this.message = message;
    this.status = status;
    this.createdAt = createdAt;
    this.respondedAt = respondedAt;
    this.completedAt = completedAt;
  }

  static create({ id, challengerUserId, opponentUserId, message, now }) {
    return new Challenge({
      id,
      challengerUserId,
      opponentUserId,
      message: message ?? null,
      status: CHALLENGE_STATUS.PENDING,
      createdAt: now,
    });
  }

  /** Legal only from PENDING, opponent-only (ownership checked by the use
   * case, not here -- mirrors Goal's identical split). */
  accept(now) {
    if (this.status !== CHALLENGE_STATUS.PENDING) {
      throw new InvalidChallengeState(this.status, 'accept');
    }
    this.status = CHALLENGE_STATUS.ACCEPTED;
    this.respondedAt = now;
  }

  /** Legal only from PENDING, opponent-only. */
  reject(now) {
    if (this.status !== CHALLENGE_STATUS.PENDING) {
      throw new InvalidChallengeState(this.status, 'reject');
    }
    this.status = CHALLENGE_STATUS.REJECTED;
    this.respondedAt = now;
  }

  /** Legal only from PENDING, challenger-only (withdraw before the
   * opponent responds). */
  cancel(now) {
    if (this.status !== CHALLENGE_STATUS.PENDING) {
      throw new InvalidChallengeState(this.status, 'cancel');
    }
    this.status = CHALLENGE_STATUS.CANCELLED;
    this.respondedAt = now;
  }

  /** Legal only from ACCEPTED. Not called by any HTTP action directly --
   * only as a side effect of submitMatchScore.js, once the two players'
   * ChallengeMatchResult submissions agree and get recorded into
   * competition. Terminal, like REJECTED/CANCELLED. */
  complete(now) {
    if (this.status !== CHALLENGE_STATUS.ACCEPTED) {
      throw new InvalidChallengeState(this.status, 'complete');
    }
    this.status = CHALLENGE_STATUS.COMPLETED;
    this.completedAt = now;
  }
}
