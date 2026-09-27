import { beforeEach, describe, expect, it } from 'vitest';

import { createSetCourtPrice } from '../../../../src/modules/booking/application/useCases/setCourtPrice.js';
import { createGetCourtPriceHistory } from '../../../../src/modules/booking/application/useCases/getCourtPriceHistory.js';
import { CourtNotFound } from '../../../../src/modules/booking/application/errors/CourtNotFound.js';

import {
  createFakeClock,
  createFakeCourtRepository,
  createFakeReservationRepository,
} from './fakes.js';

const NOW = new Date('2026-03-05T15:00:00Z');
const ADMIN = { actorUserId: 'admin-1', actorRoles: ['ADMINISTRADOR'] };
const hoursFromNow = (h) => new Date(NOW.getTime() + h * 3600e3);

function reservation(id, status, startsInHours, priceCop = 50000n) {
  return {
    id,
    courtId: 'court-1',
    status,
    periodStart: hoursFromNow(startsInHours),
    periodEnd: hoursFromNow(startsInHours + 1),
    priceCop,
  };
}

describe('court prices', () => {
  let courtRepository;
  let reservations;
  let auditEntries;
  let deps;

  beforeEach(() => {
    courtRepository = createFakeCourtRepository([
      { id: 'court-1', name: 'Cancha 1', isActive: true, priceCop: 50000n },
      { id: 'court-2', name: 'Cancha 2', isActive: false, priceCop: null },
    ]);
    reservations = new Map(
      [
        reservation('r-confirmed', 'CONFIRMED', 24),
        reservation('r-hold', 'HOLD', 2),
        reservation('r-cancelled', 'CANCELLED', 30),
        reservation('r-past', 'CONFIRMED', -48),
      ].map((r) => [r.id, r]),
    );
    auditEntries = [];
    deps = {
      courtRepository,
      reservationRepository: createFakeReservationRepository(reservations),
      auditLog: { record: async (e) => auditEntries.push(e) },
      playerDirectoryProvider: {
        getPlayerSummaries: async (ids) =>
          new Map(ids.map((id) => [id, { id, firstName: 'Marta', lastName: 'Gómez' }])),
      },
      clock: createFakeClock(NOW),
      clubId: 'club-1',
    };
  });

  it('a new price applies to new reservations; the ones already made keep theirs', async () => {
    const result = await createSetCourtPrice(deps)({
      courtId: 'court-1',
      priceCop: 60000,
      ...ADMIN,
    });

    expect(result).toEqual({
      courtId: 'court-1',
      priceCop: 60000n,
      previousPriceCop: 50000n,
      upcomingReservations: 2, // the confirmed one and the hold; not cancelled or past ones
    });
    expect(reservations.get('r-confirmed').priceCop).toBe(50000n);
    expect((await courtRepository.findActiveById('club-1', 'court-1')).priceCop).toBe(60000n);
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: 'COURT_PRICE_CHANGED',
        entityId: 'court-1',
        before: { priceCop: '50000' },
        after: { priceCop: '60000' },
      }),
    ]);
  });

  it('keeps the history: previous price, new price, who and when, newest first', async () => {
    const setCourtPrice = createSetCourtPrice(deps);
    await setCourtPrice({ courtId: 'court-1', priceCop: 60000, ...ADMIN });
    await setCourtPrice({ courtId: 'court-1', priceCop: 65000, ...ADMIN });

    const view = await createGetCourtPriceHistory(deps)({ courtId: 'court-1' });
    expect(view.upcomingReservations).toBe(2);
    expect(view.history.map((h) => [h.previousPriceCop, h.newPriceCop, h.changedByName])).toEqual([
      [60000n, 65000n, 'Marta Gómez'],
      [50000n, 60000n, 'Marta Gómez'],
    ]);
  });

  it.each(['does-not-exist', 'court-2'])(
    'rejects an unknown or inactive court (%s)',
    async (id) => {
      await expect(
        createSetCourtPrice(deps)({ courtId: id, priceCop: 60000, ...ADMIN }),
      ).rejects.toThrow(CourtNotFound);
      await expect(createGetCourtPriceHistory(deps)({ courtId: id })).rejects.toThrow(
        CourtNotFound,
      );
      expect(auditEntries).toHaveLength(0);
    },
  );
});
