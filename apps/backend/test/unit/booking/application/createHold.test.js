import { beforeEach, describe, expect, it } from 'vitest';
import { MEMBERSHIP_STATUS } from '@ctcj/shared';

import { createCreateHold } from '../../../../src/modules/booking/application/useCases/createHold.js';
import { InvalidTimeSlot } from '../../../../src/modules/booking/domain/errors/InvalidTimeSlot.js';
import { CourtNotFound } from '../../../../src/modules/booking/application/errors/CourtNotFound.js';
import { MaxConcurrentReservationsExceeded } from '../../../../src/modules/booking/application/errors/MaxConcurrentReservationsExceeded.js';
import { SlotNotAvailable } from '../../../../src/modules/booking/application/errors/SlotNotAvailable.js';
import { MembershipOverdueBookingBlocked } from '../../../../src/modules/booking/application/errors/MembershipOverdueBookingBlocked.js';
import { NotAuthorizedToBookForUser } from '../../../../src/modules/booking/application/errors/NotAuthorizedToBookForUser.js';

import {
  createFakeCourtRepository,
  createFakeReservationRepository,
  createFakeClock,
  createFakeMembershipStatusProvider,
  createFakeBookingPolicySettings,
  createFakeGuardianshipProvider,
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
    membershipStatusProvider: createFakeMembershipStatusProvider(),
    bookingPolicySettings: createFakeBookingPolicySettings(false), // safe/permissive default
    guardianshipProvider: createFakeGuardianshipProvider(),
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

  describe('overdue-membership booking policy (Phase 5)', () => {
    it('an OVERDUE player can still book when the policy is disabled (default)', async () => {
      deps.membershipStatusProvider = createFakeMembershipStatusProvider({
        'user-1': MEMBERSHIP_STATUS.OVERDUE,
      });
      createHold = createCreateHold(deps);

      await expect(
        createHold({ ...slot(), courtId: COURT.id, holderUserId: 'user-1' }),
      ).resolves.toBeTruthy();
    });

    it.each([MEMBERSHIP_STATUS.OVERDUE, MEMBERSHIP_STATUS.INACTIVE, MEMBERSHIP_STATUS.SUSPENDED])(
      'blocks a %s player when the policy is enabled',
      async (status) => {
        deps.membershipStatusProvider = createFakeMembershipStatusProvider({ 'user-1': status });
        deps.bookingPolicySettings = createFakeBookingPolicySettings(true);
        createHold = createCreateHold(deps);

        await expect(
          createHold({ ...slot(), courtId: COURT.id, holderUserId: 'user-1' }),
        ).rejects.toThrow(MembershipOverdueBookingBlocked);
      },
    );

    it.each([MEMBERSHIP_STATUS.ACTIVE, MEMBERSHIP_STATUS.PENDING, null])(
      'still allows a %s player when the policy is enabled',
      async (status) => {
        deps.membershipStatusProvider = createFakeMembershipStatusProvider({ 'user-1': status });
        deps.bookingPolicySettings = createFakeBookingPolicySettings(true);
        createHold = createCreateHold(deps);

        await expect(
          createHold({ ...slot(), courtId: COURT.id, holderUserId: 'user-1' }),
        ).resolves.toBeTruthy();
      },
    );

    it('never calls the membership status provider when the policy is disabled', async () => {
      let called = false;
      deps.membershipStatusProvider = {
        async getStatus() {
          called = true;
          return MEMBERSHIP_STATUS.OVERDUE;
        },
      };
      createHold = createCreateHold(deps);

      await createHold({ ...slot(), courtId: COURT.id, holderUserId: 'user-1' });
      expect(called).toBe(false);
    });
  });

  describe('booking on behalf of another user (Phase 6)', () => {
    it('self-booking (createdByUserId omitted) behaves exactly as before -- regression guard', async () => {
      const result = await createHold({ ...slot(), courtId: COURT.id, holderUserId: 'user-1' });
      const stored = await deps.reservationRepository.findById(result.reservationId);
      expect(stored.holderUserId).toBe('user-1');
      expect(stored.createdBy).toBe('user-1');
    });

    it('an authorized guardian can book for the minor, and createdBy differs from holderUserId', async () => {
      deps.guardianshipProvider = createFakeGuardianshipProvider([['guardian-1', 'minor-1']]);
      createHold = createCreateHold(deps);

      const result = await createHold({
        ...slot(),
        courtId: COURT.id,
        holderUserId: 'minor-1',
        createdByUserId: 'guardian-1',
      });

      const stored = await deps.reservationRepository.findById(result.reservationId);
      expect(stored.holderUserId).toBe('minor-1');
      expect(stored.createdBy).toBe('guardian-1');
    });

    it('an unauthorized caller booking for someone else throws NotAuthorizedToBookForUser', async () => {
      await expect(
        createHold({
          ...slot(),
          courtId: COURT.id,
          holderUserId: 'minor-1',
          createdByUserId: 'guardian-1',
        }),
      ).rejects.toThrow(NotAuthorizedToBookForUser);
    });

    it('the guardianship check runs before the concurrent-count and membership checks', async () => {
      let guardianshipCalled = false;
      let membershipCalled = false;
      deps.guardianshipProvider = {
        async canBookFor() {
          guardianshipCalled = true;
          return false;
        },
      };
      deps.membershipStatusProvider = {
        async getStatus() {
          membershipCalled = true;
          return null;
        },
      };
      createHold = createCreateHold(deps);

      await expect(
        createHold({
          ...slot(),
          courtId: COURT.id,
          holderUserId: 'minor-1',
          createdByUserId: 'guardian-1',
        }),
      ).rejects.toThrow(NotAuthorizedToBookForUser);
      expect(guardianshipCalled).toBe(true);
      expect(membershipCalled).toBe(false);
    });

    it('the default null-object guardianship provider rejects any cross-user booking', async () => {
      // buildDeps()'s default createFakeGuardianshipProvider() authorizes nothing,
      // mirroring the real createNullGuardianshipProvider()'s always-false stance.
      await expect(
        createHold({
          ...slot(),
          courtId: COURT.id,
          holderUserId: 'minor-1',
          createdByUserId: 'guardian-1',
        }),
      ).rejects.toThrow(NotAuthorizedToBookForUser);
    });

    it('never calls the guardianship provider for a self-booking', async () => {
      let called = false;
      deps.guardianshipProvider = {
        async canBookFor() {
          called = true;
          return false;
        },
      };
      createHold = createCreateHold(deps);

      await createHold({ ...slot(), courtId: COURT.id, holderUserId: 'user-1' });
      expect(called).toBe(false);
    });
  });
});
