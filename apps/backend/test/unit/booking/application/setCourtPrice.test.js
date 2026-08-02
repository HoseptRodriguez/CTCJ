import { beforeEach, describe, expect, it } from 'vitest';

import { createSetCourtPrice } from '../../../../src/modules/booking/application/useCases/setCourtPrice.js';
import { CourtNotFound } from '../../../../src/modules/booking/application/errors/CourtNotFound.js';

import { createFakeCourtRepository } from './fakes.js';

describe('setCourtPrice', () => {
  let courtRepository;
  let setCourtPrice;

  beforeEach(() => {
    courtRepository = createFakeCourtRepository([
      { id: 'court-1', name: 'Cancha 1', isActive: true, priceCop: null },
    ]);
    setCourtPrice = createSetCourtPrice({ courtRepository, clubId: 'club-1' });
  });

  it('sets the price and returns it', async () => {
    const result = await setCourtPrice({ courtId: 'court-1', priceCop: 60000 });
    expect(result).toEqual({ courtId: 'court-1', priceCop: 60000n });

    const court = await courtRepository.findActiveById('club-1', 'court-1');
    expect(court.priceCop).toBe(60000n);
  });

  it('rejects an unknown court', async () => {
    await expect(setCourtPrice({ courtId: 'does-not-exist', priceCop: 60000 })).rejects.toThrow(
      CourtNotFound,
    );
  });

  it('rejects an inactive court', async () => {
    courtRepository = createFakeCourtRepository([
      { id: 'court-2', name: 'Cancha 2', isActive: false, priceCop: null },
    ]);
    setCourtPrice = createSetCourtPrice({ courtRepository, clubId: 'club-1' });

    await expect(setCourtPrice({ courtId: 'court-2', priceCop: 60000 })).rejects.toThrow(
      CourtNotFound,
    );
  });
});
