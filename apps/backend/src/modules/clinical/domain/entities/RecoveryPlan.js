import { InvalidRecoveryPlanState } from '../errors/InvalidRecoveryPlanState.js';

export const RECOVERY_PLAN_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  DISCONTINUED: 'DISCONTINUED',
});

/**
 * A physiotherapy recovery plan -- Physiotherapy-only, no Psychology
 * equivalent. Framework-agnostic by construction: no Express/Prisma
 * imports anywhere in this file (enforced mechanically by
 * .dependency-cruiser.js's clinical-domain-isolated rule).
 */
export class RecoveryPlan {
  constructor({
    id,
    playerId,
    practitionerId,
    title,
    goal = null,
    visibility,
    status = RECOVERY_PLAN_STATUS.ACTIVE,
    createdAt = null,
    resolvedAt = null,
    resolvedBy = null,
    discontinueReason = null,
  }) {
    this.id = id;
    this.playerId = playerId;
    this.practitionerId = practitionerId;
    this.title = title;
    this.goal = goal;
    this.visibility = visibility;
    this.status = status;
    this.createdAt = createdAt;
    this.resolvedAt = resolvedAt;
    this.resolvedBy = resolvedBy;
    this.discontinueReason = discontinueReason;
  }

  static create({ id, playerId, practitionerId, title, goal, visibility, now }) {
    return new RecoveryPlan({
      id,
      playerId,
      practitionerId,
      title,
      goal,
      visibility,
      status: RECOVERY_PLAN_STATUS.ACTIVE,
      createdAt: now,
    });
  }

  /** Legal only from ACTIVE -- the plan's goal was achieved. */
  complete({ resolvedBy, now }) {
    if (this.status !== RECOVERY_PLAN_STATUS.ACTIVE) {
      throw new InvalidRecoveryPlanState(this.status, 'complete');
    }
    this.status = RECOVERY_PLAN_STATUS.COMPLETED;
    this.resolvedAt = now;
    this.resolvedBy = resolvedBy;
  }

  /** Legal only from ACTIVE -- the plan was abandoned before completion. */
  discontinue({ reason, resolvedBy, now }) {
    if (this.status !== RECOVERY_PLAN_STATUS.ACTIVE) {
      throw new InvalidRecoveryPlanState(this.status, 'discontinue');
    }
    this.status = RECOVERY_PLAN_STATUS.DISCONTINUED;
    this.resolvedAt = now;
    this.resolvedBy = resolvedBy;
    this.discontinueReason = reason;
  }
}
