import { beforeEach, describe, expect, it } from 'vitest';

import { createCreateSeason } from '../../../../src/modules/competition/application/useCases/createSeason.js';
import { SeasonAlreadyOpen } from '../../../../src/modules/competition/application/errors/SeasonAlreadyOpen.js';

import { createFakeSeasonRepository, createFakeClock } from './fakes.js';

describe('createSeason', () => {
  let seasonRepository;
  let createSeason;

  beforeEach(() => {
    seasonRepository = createFakeSeasonRepository();
    createSeason = createCreateSeason({
      seasonRepository,
      clock: createFakeClock(new Date('2026-01-01')),
      clubId: 'club-1',
    });
  });

  it('creates an OPEN season when the club has none open', async () => {
    const season = await createSeason({
      name: 'Temporada 1 · 2026',
      year: 2026,
      seasonNumber: 1,
      startDate: new Date('2026-01-01'),
      createdByUserId: 'admin-1',
    });

    expect(season.status).toBe('OPEN');
    expect(season.clubId).toBe('club-1');
    expect(season.createdBy).toBe('admin-1');
  });

  it('throws SeasonAlreadyOpen when the club already has an OPEN season', async () => {
    await createSeason({
      name: 'Temporada 1 · 2026',
      year: 2026,
      seasonNumber: 1,
      startDate: new Date('2026-01-01'),
      createdByUserId: 'admin-1',
    });

    await expect(
      createSeason({
        name: 'Temporada 2 · 2026',
        year: 2026,
        seasonNumber: 2,
        startDate: new Date('2026-07-01'),
        createdByUserId: 'admin-1',
      }),
    ).rejects.toThrow(SeasonAlreadyOpen);
  });

  it('allows a new OPEN season for a different club', async () => {
    await createSeason({
      name: 'Temporada 1 · 2026',
      year: 2026,
      seasonNumber: 1,
      startDate: new Date('2026-01-01'),
      createdByUserId: 'admin-1',
    });

    const otherClubCreate = createCreateSeason({
      seasonRepository,
      clock: createFakeClock(new Date('2026-01-01')),
      clubId: 'club-2',
    });

    const season = await otherClubCreate({
      name: 'Temporada 1 · 2026',
      year: 2026,
      seasonNumber: 1,
      startDate: new Date('2026-01-01'),
      createdByUserId: 'admin-2',
    });
    expect(season.clubId).toBe('club-2');
  });
});
