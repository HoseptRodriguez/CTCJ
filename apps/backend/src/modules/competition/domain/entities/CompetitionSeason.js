import { InvalidSeasonState } from '../errors/InvalidSeasonState.js';

export const SEASON_STATUS = Object.freeze({ OPEN: 'OPEN', CLOSED: 'CLOSED' });

/**
 * A club-wide ranking season (two per year). One-way lifecycle: OPEN -> CLOSED,
 * never reopened. Framework-agnostic by construction: no Express/Prisma
 * imports anywhere in this file (enforced mechanically by
 * .dependency-cruiser.js).
 */
export class CompetitionSeason {
  constructor({
    id,
    clubId,
    name,
    year,
    seasonNumber,
    status = SEASON_STATUS.OPEN,
    startDate,
    endDate = null,
    createdBy,
    createdAt = null,
    closedAt = null,
    closedBy = null,
  }) {
    this.id = id;
    this.clubId = clubId;
    this.name = name;
    this.year = year;
    this.seasonNumber = seasonNumber;
    this.status = status;
    this.startDate = startDate;
    this.endDate = endDate;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.closedAt = closedAt;
    this.closedBy = closedBy;
  }

  static create({ id, clubId, name, year, seasonNumber, startDate, createdBy, now }) {
    return new CompetitionSeason({
      id,
      clubId,
      name,
      year,
      seasonNumber,
      status: SEASON_STATUS.OPEN,
      startDate,
      createdBy,
      createdAt: now,
    });
  }

  isOpen() {
    return this.status === SEASON_STATUS.OPEN;
  }

  /** In-memory guard used before recording a match -- the season must be OPEN. */
  assertOpen() {
    if (!this.isOpen()) {
      throw new InvalidSeasonState(this.status, 'recordMatch');
    }
  }

  /** Legal only from OPEN -- one-way, a closed season is never reopened. */
  close({ closedBy, now }) {
    if (!this.isOpen()) {
      throw new InvalidSeasonState(this.status, 'close');
    }
    this.status = SEASON_STATUS.CLOSED;
    this.closedAt = now;
    this.closedBy = closedBy;
  }
}
