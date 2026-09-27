import { describe, expect, it } from 'vitest';

import { generatePlanCode } from '../../../../src/modules/billing/domain/services/planCode.js';
import {
  clubToday,
  earliestPriceStart,
  isScheduled,
} from '../../../../src/modules/billing/domain/services/priceSchedule.js';

const day = (key) => new Date(`${key}T00:00:00Z`);

describe('the plan code is generated from its name', () => {
  it.each([
    ['Iniciación', 'INICIACION'],
    ['Iniciación Niños', 'INICIACION_NINOS'],
    ['  Élite ++ Pro  ', 'ELITE_PRO'],
    ['¡¡!!', 'PLAN'],
  ])('%s -> %s', (name, code) => {
    expect(generatePlanCode(name)).toBe(code);
  });

  it('never repeats a code in use: adds _2, _3...', () => {
    expect(generatePlanCode('Avanzado', new Set(['AVANZADO']))).toBe('AVANZADO_2');
    expect(generatePlanCode('Avanzado', new Set(['AVANZADO', 'AVANZADO_2']))).toBe('AVANZADO_3');
  });

  it('stays within 40 characters, suffix included', () => {
    const long = 'Plan de entrenamiento competitivo avanzado para adultos';
    const code = generatePlanCode(long, new Set([generatePlanCode(long)]));
    expect(code.length).toBeLessThanOrEqual(40);
    expect(code.endsWith('_2')).toBe(true);
  });
});

describe('when a new price can start', () => {
  it('"today" is the club date (Fusagasugá), not the UTC date', () => {
    // 2026-03-05 at 23:30 in Fusagasugá is already 2026-03-06 in UTC.
    expect(clubToday(new Date('2026-03-06T04:30:00Z'))).toEqual(day('2026-03-05'));
  });

  it('a change on a plan with active players waits the notice period', () => {
    expect(
      earliestPriceStart({
        today: day('2026-03-05'),
        hasCurrentPrice: true,
        activePlayers: 3,
        noticeDays: 30,
      }),
    ).toEqual(day('2026-04-04'));
  });

  it.each([
    ['the first price of a plan', { hasCurrentPrice: false, activePlayers: 3 }],
    ['a change on a plan nobody has', { hasCurrentPrice: true, activePlayers: 0 }],
  ])('%s can start today', (_label, input) => {
    expect(earliestPriceStart({ today: day('2026-03-05'), noticeDays: 30, ...input })).toEqual(
      day('2026-03-05'),
    );
  });

  it('a price is "scheduled" only while its first day has not arrived', () => {
    expect(isScheduled({ validFrom: day('2026-03-06') }, day('2026-03-05'))).toBe(true);
    expect(isScheduled({ validFrom: day('2026-03-05') }, day('2026-03-05'))).toBe(false);
    expect(isScheduled(null, day('2026-03-05'))).toBe(false);
  });
});
