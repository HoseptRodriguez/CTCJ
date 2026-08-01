import { describe, expect, it } from 'vitest';

import { isWithoutPenalty } from '../../../../src/modules/booking/domain/policies/cancellationPolicy.js';
import { Reservation } from '../../../../src/modules/booking/domain/entities/Reservation.js';

const PERIOD_START = new Date('2026-08-10T15:00:00Z');

function buildConfirmedReservation() {
  return new Reservation({
    id: 'res-1',
    clubId: 'club-1',
    courtId: 'court-1',
    periodStart: PERIOD_START,
    periodEnd: new Date(PERIOD_START.getTime() + 60 * 60_000),
    status: 'CONFIRMED',
    reservationType: 'PRIVATE',
    holderUserId: 'user-1',
    createdBy: 'user-1',
  });
}

describe('Regla: cancelacion sin penalidad con 12 horas de anticipacion', () => {
  it('is without penalty at exactly 12 hours before the start', () => {
    const now = new Date(PERIOD_START.getTime() - 12 * 60 * 60_000);
    expect(isWithoutPenalty(PERIOD_START, now)).toBe(true);
  });

  it('is without penalty well before the 12-hour window', () => {
    const now = new Date(PERIOD_START.getTime() - 24 * 60 * 60_000);
    expect(isWithoutPenalty(PERIOD_START, now)).toBe(true);
  });

  it('incurs a penalty just inside the 12-hour window', () => {
    const now = new Date(PERIOD_START.getTime() - 12 * 60 * 60_000 + 60_000);
    expect(isWithoutPenalty(PERIOD_START, now)).toBe(false);
  });

  it('Reservation.cancel() surfaces the penalty-free fact without computing money', () => {
    const reservation = buildConfirmedReservation();
    const now = new Date(PERIOD_START.getTime() - 24 * 60 * 60_000);
    const result = reservation.cancel(now);
    expect(result).toEqual({ withoutPenalty: true });
    expect(reservation.status).toBe('CANCELLED');
    expect(reservation.priceCop).toBeNull(); // untouched -- booking never computes money
  });

  it('Reservation.cancel() inside the window still cancels, but flags a penalty', () => {
    const reservation = buildConfirmedReservation();
    const now = new Date(PERIOD_START.getTime() - 1 * 60 * 60_000);
    const result = reservation.cancel(now);
    expect(result).toEqual({ withoutPenalty: false });
    expect(reservation.status).toBe('CANCELLED');
  });
});
