import { InvalidTournamentState } from '../errors/InvalidTournamentState.js';
import { NotEnoughParticipants } from '../errors/NotEnoughParticipants.js';

export const TOURNAMENT_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  DRAW_GENERATED: 'DRAW_GENERATED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

/**
 * A staff-run single-elimination bracket. Framework-agnostic by
 * construction: no Express/Prisma imports anywhere in this file (enforced
 * mechanically by .dependency-cruiser.js).
 */
export class Tournament {
  constructor({
    id,
    clubId,
    name,
    category,
    modality,
    status = TOURNAMENT_STATUS.DRAFT,
    createdBy,
    createdAt = null,
    drawGeneratedAt = null,
    completedAt = null,
    cancelledAt = null,
    championId = null,
  }) {
    this.id = id;
    this.clubId = clubId;
    this.name = name;
    this.category = category;
    this.modality = modality;
    this.status = status;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.drawGeneratedAt = drawGeneratedAt;
    this.completedAt = completedAt;
    this.cancelledAt = cancelledAt;
    this.championId = championId;
  }

  static create({ id, clubId, name, category, modality, createdBy, now }) {
    return new Tournament({
      id,
      clubId,
      name,
      category,
      modality,
      status: TOURNAMENT_STATUS.DRAFT,
      createdBy,
      createdAt: now,
    });
  }

  /** In-memory guard used before adding/removing a participant -- only
   * legal while the bracket hasn't been generated yet. */
  assertDraft(attemptedAction) {
    if (this.status !== TOURNAMENT_STATUS.DRAFT) {
      throw new InvalidTournamentState(this.status, attemptedAction);
    }
  }

  /** Legal only from DRAFT, and only with >= 2 registered participants. */
  generateDraw({ participantCount, now }) {
    if (this.status !== TOURNAMENT_STATUS.DRAFT) {
      throw new InvalidTournamentState(this.status, 'generateDraw');
    }
    if (participantCount < 2) {
      throw new NotEnoughParticipants(participantCount);
    }
    this.status = TOURNAMENT_STATUS.DRAW_GENERATED;
    this.drawGeneratedAt = now;
  }

  /** In-memory guard used before recording a match result -- the bracket
   * must exist. */
  assertDrawGenerated(attemptedAction) {
    if (this.status !== TOURNAMENT_STATUS.DRAW_GENERATED) {
      throw new InvalidTournamentState(this.status, attemptedAction);
    }
  }

  /** Legal only from DRAW_GENERATED -- fires once the final match is recorded. */
  complete({ championId, now }) {
    if (this.status !== TOURNAMENT_STATUS.DRAW_GENERATED) {
      throw new InvalidTournamentState(this.status, 'complete');
    }
    this.status = TOURNAMENT_STATUS.COMPLETED;
    this.completedAt = now;
    this.championId = championId;
  }

  /** Legal from DRAFT or DRAW_GENERATED, never from COMPLETED (one-way). */
  cancel({ now }) {
    if (![TOURNAMENT_STATUS.DRAFT, TOURNAMENT_STATUS.DRAW_GENERATED].includes(this.status)) {
      throw new InvalidTournamentState(this.status, 'cancel');
    }
    this.status = TOURNAMENT_STATUS.CANCELLED;
    this.cancelledAt = now;
  }
}
