import { InvalidMembershipStatusTransition } from '../errors/InvalidMembershipStatusTransition.js';

export const PLAYER_MEMBERSHIP_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  ENDED: 'ENDED',
});

/**
 * A player's enrollment in a MembershipPlan. Framework-agnostic by
 * construction: no Express/Prisma imports anywhere in this file (enforced
 * mechanically by .dependency-cruiser.js).
 */
export class PlayerMembership {
  constructor({
    id,
    playerId,
    planId,
    startDate,
    endDate = null,
    billingDay,
    frequency = 'MONTHLY',
    status = PLAYER_MEMBERSHIP_STATUS.ACTIVE,
    createdAt = null,
  }) {
    this.id = id;
    this.playerId = playerId;
    this.planId = planId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.billingDay = billingDay;
    this.frequency = frequency;
    this.status = status;
    this.createdAt = createdAt;
  }

  /** Legal only from SUSPENDED. */
  activate() {
    if (this.status !== PLAYER_MEMBERSHIP_STATUS.SUSPENDED) {
      throw new InvalidMembershipStatusTransition(this.status, PLAYER_MEMBERSHIP_STATUS.ACTIVE);
    }
    this.status = PLAYER_MEMBERSHIP_STATUS.ACTIVE;
  }

  /** Legal only from ACTIVE. */
  suspend() {
    if (this.status !== PLAYER_MEMBERSHIP_STATUS.ACTIVE) {
      throw new InvalidMembershipStatusTransition(this.status, PLAYER_MEMBERSHIP_STATUS.SUSPENDED);
    }
    this.status = PLAYER_MEMBERSHIP_STATUS.SUSPENDED;
  }

  /**
   * Legal from ACTIVE or SUSPENDED. ENDED is terminal -- a returning player
   * gets a brand-new PlayerMembership row, never a reactivated one, so
   * startDate/endDate stay a true historical period.
   */
  end(endDate) {
    if (this.status === PLAYER_MEMBERSHIP_STATUS.ENDED) {
      throw new InvalidMembershipStatusTransition(this.status, PLAYER_MEMBERSHIP_STATUS.ENDED);
    }
    this.status = PLAYER_MEMBERSHIP_STATUS.ENDED;
    this.endDate = endDate;
  }
}
