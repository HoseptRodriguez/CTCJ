import { describe, expect, it } from 'vitest';

import { CompetitionSeason } from '../../../../src/modules/competition/domain/entities/CompetitionSeason.js';
import { InvalidSeasonState } from '../../../../src/modules/competition/domain/errors/InvalidSeasonState.js';

function buildSeason() {
  return CompetitionSeason.create({
    id: 'season-1',
    clubId: 'club-1',
    name: 'Temporada 1 · 2026',
    year: 2026,
    seasonNumber: 1,
    startDate: new Date('2026-01-01'),
    createdBy: 'admin-1',
    now: new Date('2026-01-01'),
  });
}

describe('Regla: temporada abierta una sola vez', () => {
  it('a new season starts OPEN', () => {
    const season = buildSeason();
    expect(season.status).toBe('OPEN');
    expect(season.isOpen()).toBe(true);
  });

  it('close() is legal from OPEN', () => {
    const season = buildSeason();
    const now = new Date('2026-06-30');
    season.close({ closedBy: 'admin-1', now });

    expect(season.status).toBe('CLOSED');
    expect(season.closedAt).toBe(now);
    expect(season.closedBy).toBe('admin-1');
  });

  it('close() throws when already CLOSED', () => {
    const season = buildSeason();
    season.close({ closedBy: 'admin-1', now: new Date('2026-06-30') });

    expect(() => season.close({ closedBy: 'admin-1', now: new Date('2026-07-01') })).toThrow(
      InvalidSeasonState,
    );
  });

  it('assertOpen() throws once the season is CLOSED', () => {
    const season = buildSeason();
    season.close({ closedBy: 'admin-1', now: new Date('2026-06-30') });

    expect(() => season.assertOpen()).toThrow(InvalidSeasonState);
  });

  it('assertOpen() is a no-op while OPEN', () => {
    const season = buildSeason();
    expect(() => season.assertOpen()).not.toThrow();
  });
});
