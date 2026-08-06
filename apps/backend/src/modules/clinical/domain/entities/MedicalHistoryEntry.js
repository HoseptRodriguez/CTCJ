import { InvalidMedicalHistoryEntryState } from '../errors/InvalidMedicalHistoryEntryState.js';

export const MEDICAL_HISTORY_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED',
});

/**
 * A physiotherapy medical history entry (a past or ongoing condition) --
 * Physiotherapy-only, no Psychology equivalent. Framework-agnostic by
 * construction: no Express/Prisma imports anywhere in this file (enforced
 * mechanically by .dependency-cruiser.js's clinical-domain-isolated rule).
 */
export class MedicalHistoryEntry {
  constructor({
    id,
    playerId,
    practitionerId,
    condition,
    description = null,
    visibility,
    status = MEDICAL_HISTORY_STATUS.ACTIVE,
    occurredAt = null,
    createdAt = null,
    resolvedAt = null,
    resolvedBy = null,
  }) {
    this.id = id;
    this.playerId = playerId;
    this.practitionerId = practitionerId;
    this.condition = condition;
    this.description = description;
    this.visibility = visibility;
    this.status = status;
    this.occurredAt = occurredAt;
    this.createdAt = createdAt;
    this.resolvedAt = resolvedAt;
    this.resolvedBy = resolvedBy;
  }

  static create({
    id,
    playerId,
    practitionerId,
    condition,
    description,
    visibility,
    occurredAt,
    now,
  }) {
    return new MedicalHistoryEntry({
      id,
      playerId,
      practitionerId,
      condition,
      description,
      visibility,
      occurredAt,
      status: MEDICAL_HISTORY_STATUS.ACTIVE,
      createdAt: now,
    });
  }

  /** Legal only from ACTIVE -- the condition has healed/resolved. */
  resolve({ resolvedBy, now }) {
    if (this.status !== MEDICAL_HISTORY_STATUS.ACTIVE) {
      throw new InvalidMedicalHistoryEntryState(this.status, 'resolve');
    }
    this.status = MEDICAL_HISTORY_STATUS.RESOLVED;
    this.resolvedAt = now;
    this.resolvedBy = resolvedBy;
  }
}
