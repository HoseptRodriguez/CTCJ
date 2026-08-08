import { beforeEach, describe, expect, it } from 'vitest';

import { createGetMyTrainingFrequency } from '../../../../src/modules/booking/application/useCases/getMyTrainingFrequency.js';
import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';

import { createFakeReservationRepository, createFakeClock } from './fakes.js';

const CLUB_ID = 'club-1';
const NOW = new Date('2026-08-10T12:00:00Z');

async function seedReservation(
  repo,
  { id, periodStart, status = 'CONFIRMED', reservationType = 'CLASS', holderUserId = 'user-1' },
) {
  const reservation = new Reservation({
    id,
    clubId: CLUB_ID,
    courtId: 'court-1',
    periodStart,
    periodEnd: new Date(periodStart.getTime() + 60 * 60 * 1000),
    status,
    reservationType,
    holderUserId,
    createdBy: holderUserId,
  });
  await repo.createHold(reservation);
}

describe('getMyTrainingFrequency', () => {
  let deps;
  let getMyTrainingFrequency;

  beforeEach(() => {
    deps = {
      reservationRepository: createFakeReservationRepository(),
      clock: createFakeClock(NOW),
    };
    getMyTrainingFrequency = createGetMyTrainingFrequency(deps);
  });

  it('counts CONFIRMED CLASS reservations within the last 7 days by default', async () => {
    await seedReservation(deps.reservationRepository, {
      id: 'r1',
      periodStart: new Date('2026-08-09T10:00:00Z'),
    });
    await seedReservation(deps.reservationRepository, {
      id: 'r2',
      periodStart: new Date('2026-08-08T10:00:00Z'),
    });
    // Outside the 7-day window
    await seedReservation(deps.reservationRepository, {
      id: 'r3',
      periodStart: new Date('2026-07-01T10:00:00Z'),
    });

    const result = await getMyTrainingFrequency({ playerId: 'user-1' });

    expect(result).toEqual({ count: 2 });
  });

  it('excludes non-CLASS reservations and non-CONFIRMED statuses', async () => {
    await seedReservation(deps.reservationRepository, {
      id: 'r1',
      periodStart: new Date('2026-08-09T10:00:00Z'),
      reservationType: 'PRIVATE',
    });
    await seedReservation(deps.reservationRepository, {
      id: 'r2',
      periodStart: new Date('2026-08-09T11:00:00Z'),
      status: 'CANCELLED',
    });

    const result = await getMyTrainingFrequency({ playerId: 'user-1' });

    expect(result).toEqual({ count: 0 });
  });

  it("excludes another player's reservations", async () => {
    await seedReservation(deps.reservationRepository, {
      id: 'r1',
      periodStart: new Date('2026-08-09T10:00:00Z'),
      holderUserId: 'other-player',
    });

    const result = await getMyTrainingFrequency({ playerId: 'user-1' });

    expect(result).toEqual({ count: 0 });
  });

  it('respects a custom days window', async () => {
    await seedReservation(deps.reservationRepository, {
      id: 'r1',
      periodStart: new Date('2026-08-05T10:00:00Z'),
    });

    expect(await getMyTrainingFrequency({ playerId: 'user-1', days: 3 })).toEqual({ count: 0 });
    expect(await getMyTrainingFrequency({ playerId: 'user-1', days: 10 })).toEqual({ count: 1 });
  });
});
