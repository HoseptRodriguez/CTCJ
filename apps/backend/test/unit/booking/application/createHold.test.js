import { beforeEach, describe, expect, it } from 'vitest';

import { createCreateHold } from '../../../../src/modules/booking/application/useCases/createHold.js';
import { InvalidTimeSlot } from '../../../../src/modules/booking/domain/errors/InvalidTimeSlot.js';
import { CourtNotFound } from '../../../../src/modules/booking/application/errors/CourtNotFound.js';
import { MaxConcurrentReservationsExceeded } from '../../../../src/modules/booking/application/errors/MaxConcurrentReservationsExceeded.js';
import { SlotNotAvailable } from '../../../../src/modules/booking/application/errors/SlotNotAvailable.js';

import {
  createFakeCourtRepository,
  createFakeReservationRepository,
  createFakeClock,
} from './fakes.js';

const CLUB_ID = 'club-1';
const NOW = new Date('2026-08-01T10:00:00Z');
const COURT = {
  id: 'court-1',
  name: 'Cancha 1',
  surface: 'CLAY',
  hasLighting: true,
  priceCop: null,
  isActive: true,
};

function slot(startOffsetHours = 2) {
  const periodStart = new Date(NOW.getTime() + startOffsetHours * 60 * 60_000);
  const periodEnd = new Date(periodStart.getTime() + 60 * 60_000);
  return { periodStart, periodEnd };
}

function buildDeps() {
  return {
    courtRepository: createFakeCourtRepository([COURT]),
    reservationRepository: createFakeReservationRepository(),
    clock: createFakeClock(NOW),
    clubId: CLUB_ID,
  };
}

describe('createHold', () => {
  let deps;
  let createHold;

  beforeEach(() => {
    deps = buildDeps();
    createHold = createCreateHold(deps);
  });

  it('creates a HOLD reservation and returns its expiry and price', async () => {
    const { periodStart, periodEnd } = slot();
    const result = await createHold({
      courtId: COURT.id,
      periodStart,
      periodEnd,
      holderUserId: 'user-1',
    });

    expect(result.reservationId).toBeTruthy();
    expect(result.holdExpiresAt.getTime()).toBe(NOW.getTime() + 5 * 60_000);

    const stored = await deps.reservationRepository.findById(result.reservationId);
    expect(stored.status).toBe('HOLD');
    expect(stored.holderUserId).toBe('user-1');
  });

  it('rejects an invalid slot (policy violation) before touching the repository', async () => {
    const periodStart = new Date(NOW.getTime() + 2 * 60 * 60_000);
    const periodEnd = new Date(periodStart.getTime() + 30 * 60_000); // 30 min, not 60
    await expect(
      createHold({ courtId: COURT.id, periodStart, periodEnd, holderUserId: 'user-1' }),
    ).rejects.toThrow(InvalidTimeSlot);
  });

  it('rejects an unknown court', async () => {
    const { periodStart, periodEnd } = slot();
    await expect(
      createHold({ courtId: 'not-a-real-court', periodStart, periodEnd, holderUserId: 'user-1' }),
    ).rejects.toThrow(CourtNotFound);
  });

  it('rejects a double-booked slot on the same court', async () => {
    const { periodStart, periodEnd } = slot();
    await createHold({ courtId: COURT.id, periodStart, periodEnd, holderUserId: 'user-1' });

    await expect(
      createHold({ courtId: COURT.id, periodStart, periodEnd, holderUserId: 'user-2' }),
    ).rejects.toThrow(SlotNotAvailable);
  });

  it('allows a different court at the same time', async () => {
    const { periodStart, periodEnd } = slot();
    const court2 = { ...COURT, id: 'court-2', name: 'Cancha 2' };
    deps.courtRepository = createFakeCourtRepository([COURT, court2]);
    createHold = createCreateHold(deps);

    await createHold({ courtId: COURT.id, periodStart, periodEnd, holderUserId: 'user-1' });
    await expect(
      createHold({ courtId: court2.id, periodStart, periodEnd, holderUserId: 'user-2' }),
    ).resolves.toBeTruthy();
  });

  it('rejects a 3rd concurrent hold for a player already at the cap of 2', async () => {
    await createHold({ ...slot(2), courtId: COURT.id, holderUserId: 'user-1' });
    await createHold({ ...slot(4), courtId: COURT.id, holderUserId: 'user-1' });

    await expect(
      createHold({ ...slot(6), courtId: COURT.id, holderUserId: 'user-1' }),
    ).rejects.toThrow(MaxConcurrentReservationsExceeded);
  });

  it('the cap is per-player, not global', async () => {
    await createHold({ ...slot(2), courtId: COURT.id, holderUserId: 'user-1' });
    await createHold({ ...slot(4), courtId: COURT.id, holderUserId: 'user-1' });

    await expect(
      createHold({ ...slot(6), courtId: COURT.id, holderUserId: 'user-2' }),
    ).resolves.toBeTruthy();
  });
});
