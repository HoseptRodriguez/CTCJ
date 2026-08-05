import { beforeEach, describe, expect, it } from 'vitest';

import { createCloseSeason } from '../../../../src/modules/competition/application/useCases/closeSeason.js';
import { SeasonNotFound } from '../../../../src/modules/competition/application/errors/SeasonNotFound.js';
import { InvalidSeasonState } from '../../../../src/modules/competition/domain/errors/InvalidSeasonState.js';

import { createFakeSeasonRepository, createFakeClock } from './fakes.js';

describe('closeSeason', () => {
  let seasonRepository;
  let closeSeason;

  beforeEach(() => {
    seasonRepository = createFakeSeasonRepository();
    closeSeason = createCloseSeason({
      seasonRepository,
      clock: createFakeClock(new Date('2026-06-30')),
    });
    seasonRepository._seed({
      id: 'season-1',
      clubId: 'club-1',
      name: 'Temporada 1 · 2026',
      year: 2026,
      seasonNumber: 1,
      status: 'OPEN',
      startDate: new Date('2026-01-01'),
      endDate: null,
      createdBy: 'admin-1',
      createdAt: new Date('2026-01-01'),
      closedAt: null,
      closedBy: null,
    });
  });

  it('closes an OPEN season', async () => {
    const season = await closeSeason({ seasonId: 'season-1', closedByUserId: 'admin-1' });
    expect(season.status).toBe('CLOSED');
    expect(season.closedBy).toBe('admin-1');
  });

  it('throws SeasonNotFound for an unknown seasonId', async () => {
    await expect(
      closeSeason({ seasonId: 'nonexistent', closedByUserId: 'admin-1' }),
    ).rejects.toThrow(SeasonNotFound);
  });

  it('throws InvalidSeasonState when already CLOSED', async () => {
    await closeSeason({ seasonId: 'season-1', closedByUserId: 'admin-1' });
    await expect(closeSeason({ seasonId: 'season-1', closedByUserId: 'admin-1' })).rejects.toThrow(
      InvalidSeasonState,
    );
  });
});
