import { beforeEach, describe, expect, it } from 'vitest';

import { createGetMyReservations } from '../../../../src/modules/booking/application/useCases/getMyReservations.js';
import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';

import {
  createFakeClock,
  createFakeCourtRepository,
  createFakeReservationRepository,
} from './fakes.js';

const CLUB_ID = 'club-1';
// 2026-08-10 07:00 in Bogotá (UTC-5): "today" in club time is 2026-08-10,
// whose day starts at 2026-08-10T05:00Z.
const NOW = new Date('2026-08-10T12:00:00Z');
const TODAY_START = new Date('2026-08-10T05:00:00Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function seed(repo, overrides) {
  const periodStart = overrides.periodStart;
  await repo.createHold(
    new Reservation({
      clubId: CLUB_ID,
      courtId: 'court-1',
      periodEnd: new Date(periodStart.getTime() + HOUR),
      status: 'CONFIRMED',
      reservationType: 'PRIVATE',
      holderUserId: 'me',
      createdBy: 'me',
      priceCop: 35000n,
      ...overrides,
    }),
  );
}

describe('getMyReservations', () => {
  let repo;
  let getMyReservations;

  beforeEach(() => {
    repo = createFakeReservationRepository();
    getMyReservations = createGetMyReservations({
      reservationRepository: repo,
      courtRepository: createFakeCourtRepository([
        { id: 'court-1', name: 'Cancha 1', clubId: CLUB_ID },
      ]),
      clock: createFakeClock(NOW),
      clubId: CLUB_ID,
    });
  });

  it('covers today (club time) through the next 8 days', async () => {
    const result = await getMyReservations({ userId: 'me' });
    expect(result.from).toBe(TODAY_START.toISOString());
    expect(result.to).toBe(new Date(TODAY_START.getTime() + 8 * DAY).toISOString());
  });

  it("returns only the caller's occupying reservations in the window, in order, with the court name", async () => {
    await seed(repo, {
      id: 'later',
      periodStart: new Date(TODAY_START.getTime() + 3 * DAY + 14 * HOUR),
    });
    await seed(repo, {
      id: 'earlier-today',
      periodStart: new Date(TODAY_START.getTime() + 2 * HOUR),
    });
    await seed(repo, {
      id: 'held',
      periodStart: new Date(TODAY_START.getTime() + DAY),
      status: 'HOLD',
    });
    await seed(repo, {
      id: 'cancelled',
      periodStart: new Date(TODAY_START.getTime() + DAY + HOUR),
      status: 'CANCELLED',
    });
    await seed(repo, { id: 'yesterday', periodStart: new Date(TODAY_START.getTime() - 2 * HOUR) });
    await seed(repo, { id: 'too-far', periodStart: new Date(TODAY_START.getTime() + 8 * DAY) });
    await seed(repo, {
      id: 'someone-else',
      periodStart: new Date(TODAY_START.getTime() + DAY + 2 * HOUR),
      holderUserId: 'other',
      createdBy: 'other',
    });

    const { reservations } = await getMyReservations({ userId: 'me' });

    expect(reservations.map((r) => r.id)).toEqual(['earlier-today', 'held', 'later']);
    expect(reservations[0]).toMatchObject({
      courtName: 'Cancha 1',
      isOwnBooking: true,
      bookedForOther: false,
    });
  });

  it('includes bookings the caller made for someone else (guardian for a minor), flagged as such', async () => {
    await seed(repo, {
      id: 'for-minor',
      periodStart: new Date(TODAY_START.getTime() + DAY),
      holderUserId: 'minor',
      createdBy: 'me',
    });

    const { reservations } = await getMyReservations({ userId: 'me' });

    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toMatchObject({
      id: 'for-minor',
      holderUserId: 'minor',
      bookedForOther: true,
    });
  });
});
