import { beforeEach, describe, expect, it } from 'vitest';

import { createGetSchedule } from '../../../../src/modules/booking/application/useCases/getSchedule.js';
import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';

import { createFakeCourtRepository, createFakeReservationRepository } from './fakes.js';

const CLUB_ID = 'club-1';
const COURT = {
  id: 'court-1',
  name: 'Cancha 1',
  surface: 'CLAY',
  hasLighting: true,
  priceCop: null,
  isActive: true,
};

function buildDeps() {
  return {
    courtRepository: createFakeCourtRepository([COURT]),
    reservationRepository: createFakeReservationRepository(),
    clubId: CLUB_ID,
  };
}

async function seedReservation(
  repo,
  { id, periodStart, periodEnd, reservationType = 'PRIVATE', holderUserId = 'user-1' },
) {
  const reservation = new Reservation({
    id,
    clubId: CLUB_ID,
    courtId: COURT.id,
    periodStart,
    periodEnd,
    status: 'CONFIRMED',
    reservationType,
    holderUserId,
    createdBy: holderUserId,
  });
  await repo.createHold(reservation);
}

describe('getSchedule', () => {
  let deps;
  let getSchedule;

  beforeEach(() => {
    deps = buildDeps();
    getSchedule = createGetSchedule(deps);
  });

  it('includes courts and privacy-projects reservations for the requested day', async () => {
    await seedReservation(deps.reservationRepository, {
      id: 'res-private',
      periodStart: new Date('2026-08-10T15:00:00Z'),
      periodEnd: new Date('2026-08-10T16:00:00Z'),
      reservationType: 'PRIVATE',
    });
    await seedReservation(deps.reservationRepository, {
      id: 'res-class',
      periodStart: new Date('2026-08-10T17:00:00Z'),
      periodEnd: new Date('2026-08-10T18:00:00Z'),
      reservationType: 'CLASS',
    });

    const result = await getSchedule({
      date: '2026-08-10',
      viewer: { userId: null, isStaff: false },
    });

    expect(result.courts).toEqual([COURT]);
    expect(result.reservations).toHaveLength(2);
    const labels = result.reservations.map((r) => r.label).sort();
    expect(labels).toEqual(['Clase', 'Ocupada']);
    expect(result.reservations.every((r) => r.holderUserId === undefined)).toBe(true);
  });

  it('excludes reservations outside the requested club-local day', async () => {
    await seedReservation(deps.reservationRepository, {
      id: 'res-other-day',
      periodStart: new Date('2026-08-11T15:00:00Z'),
      periodEnd: new Date('2026-08-11T16:00:00Z'),
    });

    const result = await getSchedule({
      date: '2026-08-10',
      viewer: { userId: null, isStaff: false },
    });
    expect(result.reservations).toHaveLength(0);
  });

  it('the owner sees full detail on their own reservation within the same schedule call', async () => {
    await seedReservation(deps.reservationRepository, {
      id: 'res-private',
      periodStart: new Date('2026-08-10T15:00:00Z'),
      periodEnd: new Date('2026-08-10T16:00:00Z'),
      holderUserId: 'user-1',
    });

    const result = await getSchedule({
      date: '2026-08-10',
      viewer: { userId: 'user-1', isStaff: false },
    });
    expect(result.reservations[0].holderUserId).toBe('user-1');
  });
});
