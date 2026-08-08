import { GOAL_STATUS } from '@ctcj/shared';

import { InvalidGoalState } from '../errors/InvalidGoalState.js';

/**
 * A player-owned personal target. Carries no progress column -- current
 * progress is always computed live from competition/coaching/booking data
 * on read (see getMyGoals.js), never stored/duplicated here. Framework-
 * agnostic by construction: no Express/Prisma imports anywhere in this file
 * (enforced mechanically by .dependency-cruiser.js).
 */
export class Goal {
  constructor({
    id,
    playerId,
    title,
    metricType,
    targetArea = null,
    targetValue = null,
    targetCategory = null,
    targetModality = null,
    status = GOAL_STATUS.ACTIVE,
    createdAt = null,
    achievedAt = null,
    abandonedAt = null,
  }) {
    this.id = id;
    this.playerId = playerId;
    this.title = title;
    this.metricType = metricType;
    this.targetArea = targetArea;
    this.targetValue = targetValue;
    this.targetCategory = targetCategory;
    this.targetModality = targetModality;
    this.status = status;
    this.createdAt = createdAt;
    this.achievedAt = achievedAt;
    this.abandonedAt = abandonedAt;
  }

  static create({
    id,
    playerId,
    title,
    metricType,
    targetArea,
    targetValue,
    targetCategory,
    targetModality,
    now,
  }) {
    return new Goal({
      id,
      playerId,
      title,
      metricType,
      targetArea,
      targetValue,
      targetCategory,
      targetModality,
      status: GOAL_STATUS.ACTIVE,
      createdAt: now,
    });
  }

  /** Legal only from ACTIVE, whether triggered automatically (progress met
   * the target) or -- for CUSTOM goals -- by the player marking it done. */
  achieve(now) {
    if (this.status !== GOAL_STATUS.ACTIVE) {
      throw new InvalidGoalState(this.status, 'achieve');
    }
    this.status = GOAL_STATUS.ACHIEVED;
    this.achievedAt = now;
  }

  /** Legal only from ACTIVE. One-way, terminal -- matches every other
   * append-only lifecycle in this codebase (no un-abandoning a goal). */
  abandon(now) {
    if (this.status !== GOAL_STATUS.ACTIVE) {
      throw new InvalidGoalState(this.status, 'abandon');
    }
    this.status = GOAL_STATUS.ABANDONED;
    this.abandonedAt = now;
  }
}
