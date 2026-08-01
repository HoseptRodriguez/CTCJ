import { beforeEach, describe, expect, it } from 'vitest';

import { createCancelReservation } from '../../../../src/modules/booking/application/useCases/cancelReservation.js';
import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';
import { ReservationNotFound } from '../../../../src/modules/booking/application/errors/ReservationNotFound.js';
import { ReservationNotOwned } from '../../../../src/modules/booking/domain/errors/ReservationNotOwned.js';
import { InvalidReservationState } from '../../../../src/modules/booking/domain/errors/InvalidReservationState.js';

import { createFakeReservationRepository, createFakeClock } from './fakes.js';

const NOW = new Date('2026-08-01T10:00:00Z');
const PERIOD_START = new Date(NOW.getTime() + 48 * 60 * 60_000); // 2 days out

function buildDeps() {
  return {
    reservationRepository: createFakeReservationRepository(),
    clock: createFakeClock(NOW),
  };
}

async function seedHold(repo) {
  const reservation = Reservation.createHold({
    id: 'res-1',
    clubId: 'club-1',
    courtId: 'court-1',
    periodStart: PERIOD_START,
    periodEnd: new Date(PERIOD_START.getTime() + 60 * 60_000),
    holderUserId: 'user-1',
    createdBy: 'user-1',
    now: NOW,
  });
  await repo.createHold(reservation);
  return reservation;
}

describe('cancelReservation', () => {
  let deps;
  let cancelReservation;

  beforeEach(() => {
    deps = buildDeps();
    cancelReservation = createCancelReservation(deps);
  });

  it('cancels well before the 12-hour window, without penalty', async () => {
    await seedHold(deps.reservationRepository);

    const result = await cancelReservation({
      reservationId: 'res-1',
      userId: 'user-1',
      isStaff: false,
    });

    expect(result).toEqual({ reservationId: 'res-1', status: 'CANCELLED', withoutPenalty: true });
    const stored = await deps.reservationRepository.findById('res-1');
    expect(stored.status).toBe('CANCELLED');
  });

  it('cancels inside the 12-hour window, with a penalty flagged', async () => {
    await seedHold(deps.reservationRepository);
    deps.clock.set(new Date(PERIOD_START.getTime() - 1 * 60 * 60_000)); // 1h before start

    const result = await cancelReservation({
      reservationId: 'res-1',
      userId: 'user-1',
      isStaff: false,
    });
    expect(result.withoutPenalty).toBe(false);
  });

  it('rejects an unknown reservation', async () => {
    await expect(
      cancelReservation({ reservationId: 'does-not-exist', userId: 'user-1', isStaff: false }),
    ).rejects.toThrow(ReservationNotFound);
  });

  it('rejects a non-owner, non-staff caller', async () => {
    await seedHold(deps.reservationRepository);
    await expect(
      cancelReservation({ reservationId: 'res-1', userId: 'user-2', isStaff: false }),
    ).rejects.toThrow(ReservationNotOwned);
  });

  it('allows staff to cancel on behalf of the holder', async () => {
    await seedHold(deps.reservationRepository);
    await expect(
      cancelReservation({ reservationId: 'res-1', userId: 'staff-1', isStaff: true }),
    ).resolves.toBeTruthy();
  });

  it('rejects cancelling an already-cancelled reservation', async () => {
    await seedHold(deps.reservationRepository);
    await cancelReservation({ reservationId: 'res-1', userId: 'user-1', isStaff: false });

    await expect(
      cancelReservation({ reservationId: 'res-1', userId: 'user-1', isStaff: false }),
    ).rejects.toThrow(InvalidReservationState);
  });
});
