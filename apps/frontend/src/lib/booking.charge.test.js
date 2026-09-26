import { describe, expect, it } from 'vitest';

import { isChargeable, isUnpaid } from './booking.js';

const r = (extra) => ({
  status: 'CONFIRMED',
  reservationType: 'PRIVATE',
  paymentId: null,
  ...extra,
});

describe('isChargeable / isUnpaid (Cobros and its counter)', () => {
  it('a confirmed, unpaid booking is charged at the desk', () => {
    expect(isUnpaid(r())).toBe(true);
    expect(isUnpaid(r({ reservationType: 'CLASS' }))).toBe(true);
  });

  it('paid, held or cancelled bookings are not pending', () => {
    expect(isUnpaid(r({ paymentId: 'p1' }))).toBe(false);
    expect(isUnpaid(r({ status: 'HOLD' }))).toBe(false);
    expect(isChargeable(r({ status: 'CANCELLED' }))).toBe(false);
  });

  it("the club's own maintenance and blocked time is never charged", () => {
    expect(isChargeable(r({ reservationType: 'MAINTENANCE' }))).toBe(false);
    expect(isChargeable(r({ reservationType: 'BLOCKED' }))).toBe(false);
  });
});
