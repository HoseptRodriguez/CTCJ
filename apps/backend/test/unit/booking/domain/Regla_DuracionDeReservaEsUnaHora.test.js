import { describe, expect, it } from 'vitest';

import { validateSlot } from '../../../../src/modules/booking/domain/policies/bookingPolicy.js';
import { InvalidTimeSlot } from '../../../../src/modules/booking/domain/errors/InvalidTimeSlot.js';

const NOW = new Date('2026-08-01T10:00:00Z');

function slot(startOffsetMin, durationMin) {
  const start = new Date(NOW.getTime() + startOffsetMin * 60_000);
  const end = new Date(start.getTime() + durationMin * 60_000);
  return { start, end };
}

describe('Regla: la duracion de una reserva es exactamente una hora', () => {
  it('accepts an exact 60-minute slot', () => {
    const { start, end } = slot(120, 60);
    expect(() => validateSlot(start, end, NOW)).not.toThrow();
  });

  it('rejects a 30-minute slot', () => {
    const { start, end } = slot(120, 30);
    expect(() => validateSlot(start, end, NOW)).toThrow(InvalidTimeSlot);
  });

  it('rejects a 90-minute slot', () => {
    const { start, end } = slot(120, 90);
    expect(() => validateSlot(start, end, NOW)).toThrow(InvalidTimeSlot);
  });

  it('rejects end before start', () => {
    const start = new Date(NOW.getTime() + 120 * 60_000);
    const end = new Date(start.getTime() - 60 * 60_000);
    expect(() => validateSlot(start, end, NOW)).toThrow(InvalidTimeSlot);
  });
});
