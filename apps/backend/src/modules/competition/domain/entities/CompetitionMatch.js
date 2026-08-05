import { InvalidParticipantCount } from '../errors/InvalidParticipantCount.js';
import { DuplicateParticipant } from '../errors/DuplicateParticipant.js';
import { InvalidWinnerSide } from '../errors/InvalidWinnerSide.js';
import { InvalidMatchState } from '../errors/InvalidMatchState.js';

export const MATCH_STATUS = Object.freeze({ RECORDED: 'RECORDED', VOID: 'VOID' });
export const MODALITY = Object.freeze({ SINGLES: 'SINGLES', DOBLES: 'DOBLES' });
export const CATEGORY = Object.freeze({
  SEGUNDA: 'SEGUNDA',
  TERCERA: 'TERCERA',
  CUARTA: 'CUARTA',
  QUINTA: 'QUINTA',
});

const PARTICIPANTS_PER_SIDE = Object.freeze({
  [MODALITY.SINGLES]: 1,
  [MODALITY.DOBLES]: 2,
});

/**
 * A staff-recorded match result -- never edited, only voided (a compensating
 * action, matching Invoice.cancel()'s precedent, not a mutation). Framework-
 * agnostic by construction: no Express/Prisma imports anywhere in this file
 * (enforced mechanically by .dependency-cruiser.js).
 */
export class CompetitionMatch {
  constructor({
    id,
    seasonId,
    category,
    modality,
    status = MATCH_STATUS.RECORDED,
    winnerSide,
    setsWonA,
    setsWonB,
    participantsA,
    participantsB,
    playedAt,
    notes = null,
    recordedBy,
    createdAt = null,
    voidedAt = null,
    voidedBy = null,
    voidReason = null,
  }) {
    this.id = id;
    this.seasonId = seasonId;
    this.category = category;
    this.modality = modality;
    this.status = status;
    this.winnerSide = winnerSide;
    this.setsWonA = setsWonA;
    this.setsWonB = setsWonB;
    this.participantsA = participantsA;
    this.participantsB = participantsB;
    this.playedAt = playedAt;
    this.notes = notes;
    this.recordedBy = recordedBy;
    this.createdAt = createdAt;
    this.voidedAt = voidedAt;
    this.voidedBy = voidedBy;
    this.voidReason = voidReason;
  }

  /**
   * Validates and constructs a new RECORDED match. Participant-count-per-side
   * (1 for SINGLES, 2 for DOBLES) and no-duplicate-player are cross-row
   * invariants a DB CHECK constraint can't express -- enforced here instead.
   */
  static record({
    id,
    seasonId,
    category,
    modality,
    participantsA,
    participantsB,
    winnerSide,
    setsWonA,
    setsWonB,
    playedAt,
    notes = null,
    recordedBy,
    now,
  }) {
    const expectedPerSide = PARTICIPANTS_PER_SIDE[modality];
    if (participantsA.length !== expectedPerSide || participantsB.length !== expectedPerSide) {
      throw new InvalidParticipantCount(modality, participantsA.length, participantsB.length);
    }
    const allIds = [...participantsA, ...participantsB];
    if (new Set(allIds).size !== allIds.length) {
      throw new DuplicateParticipant();
    }
    if (winnerSide !== 'A' && winnerSide !== 'B') {
      throw new InvalidWinnerSide(winnerSide);
    }
    const winnerSets = winnerSide === 'A' ? setsWonA : setsWonB;
    const loserSets = winnerSide === 'A' ? setsWonB : setsWonA;
    if (winnerSets <= loserSets) {
      throw new InvalidWinnerSide(winnerSide);
    }
    return new CompetitionMatch({
      id,
      seasonId,
      category,
      modality,
      status: MATCH_STATUS.RECORDED,
      winnerSide,
      setsWonA,
      setsWonB,
      participantsA,
      participantsB,
      playedAt,
      notes,
      recordedBy,
      createdAt: now,
    });
  }

  /** Legal only from RECORDED -- a voided match can't be voided again. */
  voidOut({ reason, voidedBy, now }) {
    if (this.status !== MATCH_STATUS.RECORDED) {
      throw new InvalidMatchState(this.status, 'void');
    }
    this.status = MATCH_STATUS.VOID;
    this.voidedAt = now;
    this.voidedBy = voidedBy;
    this.voidReason = reason;
  }
}
