import { describe, expect, it } from 'vitest';

import { createCheckIsMinor } from '../../../../src/modules/identity/application/useCases/checkIsMinor.js';

const NOW = new Date('2026-09-27T15:00:00Z');

function setup(users, approvedMinors = []) {
  return createCheckIsMinor({
    userRepository: { findById: async (id) => users[id] ?? null },
    guardianshipRepository: { existsApprovedAsMinor: async (id) => approvedMinors.includes(id) },
    clock: { now: () => NOW },
  });
}

describe('checkIsMinor', () => {
  it('by birth date: under 18 is a minor, 18 from the birthday on is not', async () => {
    const check = setup({
      teen: { birthDate: new Date('2010-05-01') },
      turnsToday: { birthDate: new Date('2008-09-27') },
      turnsTomorrow: { birthDate: new Date('2008-09-28') },
      adult: { birthDate: new Date('1980-01-01') },
    });
    expect((await check({ userId: 'teen' })).isMinor).toBe(true);
    expect((await check({ userId: 'turnsToday' })).isMinor).toBe(false);
    expect((await check({ userId: 'turnsTomorrow' })).isMinor).toBe(true);
    expect((await check({ userId: 'adult' })).isMinor).toBe(false);
  });

  it('the minor in an approved guardianship is a minor even without a birth date', async () => {
    const check = setup({ hijo: { birthDate: null }, adulto: { birthDate: null } }, ['hijo']);
    expect((await check({ userId: 'hijo' })).isMinor).toBe(true);
    expect((await check({ userId: 'adulto' })).isMinor).toBe(false);
  });

  it('an unknown account fails closed', async () => {
    expect((await setup({})({ userId: 'x' })).isMinor).toBe(true);
  });
});
