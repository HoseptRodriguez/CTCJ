import { beforeEach, describe, expect, it } from 'vitest';

import { createCreateHold } from '../../../../src/modules/booking/application/useCases/createHold.js';
import { createConfirmReservation } from '../../../../src/modules/booking/application/useCases/confirmReservation.js';
import { createCancelReservation } from '../../../../src/modules/booking/application/useCases/cancelReservation.js';
import { createSecondHourUseCases } from '../../../../src/modules/booking/application/useCases/secondHour.js';
import { MaxConcurrentReservationsExceeded } from '../../../../src/modules/booking/application/errors/MaxConcurrentReservationsExceeded.js';
import { SecondHourDisabled } from '../../../../src/modules/booking/application/errors/SecondHourDisabled.js';
import { SecondHourUnavailable } from '../../../../src/modules/booking/application/errors/SecondHourUnavailable.js';
import { ReservationNotOwned } from '../../../../src/modules/booking/domain/errors/ReservationNotOwned.js';
import { HoldExpired } from '../../../../src/modules/booking/domain/errors/HoldExpired.js';
import { InvalidReservationState } from '../../../../src/modules/booking/domain/errors/InvalidReservationState.js';

import {
  createFakeBookingPolicySettings,
  createFakeClock,
  createFakeCourtRepository,
  createFakeGuardianshipProvider,
  createFakeMembershipStatusProvider,
  createFakeReservationRepository,
} from './fakes.js';

const NOW = new Date('2026-09-28T13:00:00Z'); // 8:00 a. m. in Fusagasugá
const at = (hoursFromNow) => new Date(NOW.getTime() + hoursFromNow * 3600e3);
const ANA = { userId: 'ana', isStaff: false };

describe('the optional second hour of a reservation', () => {
  let deps;
  let createHold;
  let secondHour;
  let confirm;
  let cancel;

  beforeEach(() => {
    deps = {
      reservationRepository: createFakeReservationRepository(),
      courtRepository: createFakeCourtRepository([
        { id: 'c1', name: 'Cancha 1', isActive: true, priceCop: 20000n },
      ]),
      bookingPolicySettings: createFakeBookingPolicySettings(false, 15, true),
      membershipStatusProvider: createFakeMembershipStatusProvider(),
      guardianshipProvider: createFakeGuardianshipProvider(),
      clock: createFakeClock(NOW),
      clubId: 'club-1',
    };
    createHold = createCreateHold(deps);
    secondHour = createSecondHourUseCases(deps);
    confirm = createConfirmReservation(deps);
    cancel = createCancelReservation(deps);
  });

  // Ana holds 4:00-5:00 (8 hours from now).
  const holdFourPm = (holderUserId = 'ana', startsIn = 8) =>
    createHold({
      courtId: 'c1',
      periodStart: at(startsIn),
      periodEnd: at(startsIn + 1),
      holderUserId,
    });

  it('adds the next hour to the same held reservation: 2 hours, both prices, same hold', async () => {
    const hold = await holdFourPm();
    const result = await secondHour.addSecondHour({ reservationId: hold.reservationId, ...ANA });

    expect(result).toMatchObject({
      reservationId: hold.reservationId,
      periodStart: at(8),
      periodEnd: at(10),
      hours: 2,
      priceCop: 40000n,
      holdExpiresAt: hold.holdExpiresAt, // the 15 minutes don't restart
    });
  });

  it('"Quitar la segunda hora" goes back to one hour and one price', async () => {
    const hold = await holdFourPm();
    await secondHour.addSecondHour({ reservationId: hold.reservationId, ...ANA });
    const result = await secondHour.removeSecondHour({ reservationId: hold.reservationId, ...ANA });
    expect(result).toMatchObject({ periodEnd: at(9), hours: 1, priceCop: 20000n });
  });

  it('if someone took the next hour, it says so and the first hour stays held', async () => {
    const mine = await holdFourPm();
    await holdFourPm('luis', 9); // Luis holds 5:00-6:00

    const attempt = secondHour.addSecondHour({ reservationId: mine.reservationId, ...ANA });
    await expect(attempt).rejects.toThrow(SecondHourUnavailable);
    await expect(attempt).rejects.toMatchObject({ secondHourStart: at(9).toISOString() });

    const stored = await deps.reservationRepository.findById(mine.reservationId);
    expect(stored).toMatchObject({ status: 'HOLD', periodEnd: at(9), priceCop: 20000n });
  });

  it('never more than 2 hours', async () => {
    const hold = await holdFourPm();
    await secondHour.addSecondHour({ reservationId: hold.reservationId, ...ANA });
    await expect(
      secondHour.addSecondHour({ reservationId: hold.reservationId, ...ANA }),
    ).rejects.toThrow(InvalidReservationState);
  });

  it('a 2-hour reservation counts once towards the limit of 2 active reservations', async () => {
    const first = await holdFourPm();
    await secondHour.addSecondHour({ reservationId: first.reservationId, ...ANA });
    await expect(holdFourPm('ana', 20)).resolves.toBeDefined(); // the 2nd reservation
    await expect(holdFourPm('ana', 30)).rejects.toThrow(MaxConcurrentReservationsExceeded);
  });

  it('confirming freezes the price of both hours with the court price in effect then', async () => {
    const hold = await holdFourPm();
    await secondHour.addSecondHour({ reservationId: hold.reservationId, ...ANA });
    await deps.courtRepository.setPrice('club-1', 'c1', 25000, 'admin'); // changed while held

    const confirmed = await confirm({ reservationId: hold.reservationId, ...ANA });
    expect(confirmed).toMatchObject({ status: 'CONFIRMED', priceCop: 50000n, hours: 2 });

    await deps.courtRepository.setPrice('club-1', 'c1', 30000, 'admin'); // after confirming
    const stored = await deps.reservationRepository.findById(hold.reservationId);
    expect(stored.priceCop).toBe(50000n);
  });

  it('once confirmed it is one reservation: the hours can no longer change, one cancellation frees both', async () => {
    const hold = await holdFourPm();
    await secondHour.addSecondHour({ reservationId: hold.reservationId, ...ANA });
    await confirm({ reservationId: hold.reservationId, ...ANA });
    await expect(
      secondHour.removeSecondHour({ reservationId: hold.reservationId, ...ANA }),
    ).rejects.toThrow(InvalidReservationState);

    await cancel({ reservationId: hold.reservationId, ...ANA });
    // Both hours are free again: Luis can hold 5:00-6:00.
    await expect(holdFourPm('luis', 9)).resolves.toBeDefined();
  });

  it('after the hold expires, the second hour cannot be added', async () => {
    const hold = await holdFourPm();
    deps.clock.advanceMs(16 * 60_000);
    await expect(
      secondHour.addSecondHour({ reservationId: hold.reservationId, ...ANA }),
    ).rejects.toThrow(HoldExpired);
  });

  it('only whoever holds it (or staff) can change it', async () => {
    const hold = await holdFourPm();
    await expect(
      secondHour.addSecondHour({
        reservationId: hold.reservationId,
        userId: 'luis',
        isStaff: false,
      }),
    ).rejects.toThrow(ReservationNotOwned);
    await expect(
      secondHour.addSecondHour({
        reservationId: hold.reservationId,
        userId: 'recepcion',
        isStaff: true,
      }),
    ).resolves.toMatchObject({ hours: 2 });
  });

  it('the club can turn it off', async () => {
    await deps.bookingPolicySettings.setSecondHourEnabled(false);
    const hold = await holdFourPm();
    await expect(
      secondHour.addSecondHour({ reservationId: hold.reservationId, ...ANA }),
    ).rejects.toThrow(SecondHourDisabled);
  });
});
