import { describe, expect, it } from 'vitest';

import { formatClock, formatReservationSpan, formatTimeRange, hoursBetween } from './format.js';

// Club time is UTC-5: 21:00 UTC is 4:00 p. m. in Fusagasugá.
const at = (utcHour) => new Date(Date.UTC(2026, 8, 28, utcHour)).toISOString();

describe('reservation times as one block', () => {
  it('says the meridiem once when both ends share it', () => {
    expect(formatTimeRange(at(21), at(23))).toBe('4:00 – 6:00 p. m.');
    expect(formatTimeRange(at(16), at(18))).toBe('11:00 a. m. – 1:00 p. m.');
  });

  it('adds "· 2 horas" only to a two-hour reservation', () => {
    expect(formatReservationSpan(at(21), at(23))).toBe('4:00 – 6:00 p. m. · 2 horas');
    expect(formatReservationSpan(at(21), at(22))).toBe('4:00 – 5:00 p. m.');
    expect(hoursBetween(at(21), at(23))).toBe(2);
  });

  it('formatClock drops a. m./p. m. where the context already says it', () => {
    expect(formatClock(at(22))).toBe('5:00');
  });
});
