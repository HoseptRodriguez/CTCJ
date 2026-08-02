import { beforeEach, describe, expect, it } from 'vitest';

import { createConfirmReservation } from '../../../../src/modules/booking/application/useCases/confirmReservation.js';
import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';
import { ReservationNotFound } from '../../../../src/modules/booking/application/errors/ReservationNotFound.js';
import { ReservationNotOwned } from '../../../../src/modules/booking/domain/errors/ReservationNotOwned.js';
import { HoldExpired } from '../../../../src/modules/booking/domain/errors/HoldExpired.js';
import { InvalidReservationState } from '../../../../src/modules/booking/domain/errors/InvalidReservationState.js';

import { createFakeReservationRepository, createFakeClock } from './fakes.js';

const NOW = new Date('2026-08-01T10:00:00Z');

function buildDeps() {
  return {
    reservationRepository: createFakeReservationRepository(),
    clock: createFakeClock(NOW),
  };
}

async function seedHold(repo, overrides = {}) {
  const reservation = Reservation.createHold({
    id: 'res-1',
    clubId: 'club-1',
    courtId: 'court-1',
    periodStart: new Date(NOW.getTime() + 2 * 60 * 60_000),
    periodEnd: new Date(NOW.getTime() + 3 * 60 * 60_000),
    holderUserId: 'user-1',
    createdBy: 'user-1',
    now: NOW,
    ...overrides,
  });
  await repo.createHold(reservation);
  return reservation;
}

describe('confirmReservation', () => {
  let deps;
  let confirmReservation;

  beforeEach(() => {
    deps = buildDeps();
    confirmReservation = createConfirmReservation(deps);
  });

  it('confirms a HOLD held by the caller', async () => {
    await seedHold(deps.reservationRepository);
    deps.clock.advanceMs(60_000);

    const result = await confirmReservation({
      reservationId: 'res-1',
      userId: 'user-1',
      isStaff: false,
    });

    expect(result).toEqual({ reservationId: 'res-1', status: 'CONFIRMED' });
    const stored = await deps.reservationRepository.findById('res-1');
    expect(stored.status).toBe('CONFIRMED');
  });

  it('allows staff to confirm on behalf of the holder', async () => {
    await seedHold(deps.reservationRepository);
    await expect(
      confirmReservation({
        reservationId: 'res-1',
        userId: 'staff-1',
        isStaff: true,
      }),
    ).resolves.toBeTruthy();
  });

  it('rejects an unknown reservation', async () => {
    await expect(
      confirmReservation({
        reservationId: 'does-not-exist',
        userId: 'user-1',
        isStaff: false,
      }),
    ).rejects.toThrow(ReservationNotFound);
  });

  it('rejects a non-owner, non-staff caller', async () => {
    await seedHold(deps.reservationRepository);
    await expect(
      confirmReservation({
        reservationId: 'res-1',
        userId: 'user-2',
        isStaff: false,
      }),
    ).rejects.toThrow(ReservationNotOwned);
  });

  it('rejects confirming past the 5-minute HOLD expiry', async () => {
    await seedHold(deps.reservationRepository);
    deps.clock.advanceMs(6 * 60_000);

    await expect(
      confirmReservation({
        reservationId: 'res-1',
        userId: 'user-1',
        isStaff: false,
      }),
    ).rejects.toThrow(HoldExpired);
  });

  it('rejects confirming an already-confirmed reservation', async () => {
    await seedHold(deps.reservationRepository);
    await confirmReservation({
      reservationId: 'res-1',
      userId: 'user-1',
      isStaff: false,
    });

    await expect(
      confirmReservation({
        reservationId: 'res-1',
        userId: 'user-1',
        isStaff: false,
      }),
    ).rejects.toThrow(InvalidReservationState);
  });
});
