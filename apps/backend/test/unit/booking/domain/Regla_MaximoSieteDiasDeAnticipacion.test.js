import { describe, expect, it } from 'vitest';

import { validateSlot } from '../../../../src/modules/booking/domain/policies/bookingPolicy.js';
import { InvalidTimeSlot } from '../../../../src/modules/booking/domain/errors/InvalidTimeSlot.js';

const NOW = new Date('2026-08-01T10:00:00Z');

function slotStartingAt(start) {
  return { start, end: new Date(start.getTime() + 60 * 60_000) };
}

describe('Regla: ventana de reserva entre 30 minutos y 7 dias de anticipacion', () => {
  it('rejects a slot starting in the past', () => {
    const { start, end } = slotStartingAt(new Date(NOW.getTime() - 60 * 60_000));
    expect(() => validateSlot(start, end, NOW)).toThrow(InvalidTimeSlot);
  });

  it('rejects a slot starting only 10 minutes from now (below the 30-minute minimum)', () => {
    const { start, end } = slotStartingAt(new Date(NOW.getTime() + 10 * 60_000));
    expect(() => validateSlot(start, end, NOW)).toThrow(InvalidTimeSlot);
  });

  it('accepts a slot starting exactly 30 minutes from now', () => {
    const { start, end } = slotStartingAt(new Date(NOW.getTime() + 30 * 60_000));
    expect(() => validateSlot(start, end, NOW)).not.toThrow();
  });

  it('accepts a slot starting exactly 7 days from now', () => {
    const { start, end } = slotStartingAt(new Date(NOW.getTime() + 7 * 24 * 60 * 60_000));
    expect(() => validateSlot(start, end, NOW)).not.toThrow();
  });

  it('rejects a slot starting more than 7 days from now', () => {
    const { start, end } = slotStartingAt(new Date(NOW.getTime() + 7 * 24 * 60 * 60_000 + 60_000));
    expect(() => validateSlot(start, end, NOW)).toThrow(InvalidTimeSlot);
  });
});
