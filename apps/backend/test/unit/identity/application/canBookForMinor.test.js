import { beforeEach, describe, expect, it } from 'vitest';

import { createCanBookForMinor } from '../../../../src/modules/identity/application/useCases/canBookForMinor.js';

import { createFakeGuardianshipRepository } from './fakes.js';

describe('canBookForMinor', () => {
  let guardianshipRepository;
  let canBookForMinor;

  beforeEach(() => {
    guardianshipRepository = createFakeGuardianshipRepository();
    canBookForMinor = createCanBookForMinor({ guardianshipRepository });
  });

  it('returns { canBook: true } for an APPROVED row with canBook: true', async () => {
    const g = await guardianshipRepository.create({
      guardianUserId: 'guardian-1',
      minorUserId: 'minor-1',
      canPay: false,
      canBook: true,
    });
    await guardianshipRepository.decide(g.id, 'APPROVED', new Date(), 'admin-1', null);

    const result = await canBookForMinor({ guardianUserId: 'guardian-1', minorUserId: 'minor-1' });
    expect(result).toEqual({ canBook: true });
  });

  it('returns { canBook: false } when the row is still PENDING', async () => {
    await guardianshipRepository.create({
      guardianUserId: 'guardian-1',
      minorUserId: 'minor-1',
      canPay: false,
      canBook: true,
    });

    const result = await canBookForMinor({ guardianUserId: 'guardian-1', minorUserId: 'minor-1' });
    expect(result).toEqual({ canBook: false });
  });

  it('returns { canBook: false } when canBook was never granted', async () => {
    const g = await guardianshipRepository.create({
      guardianUserId: 'guardian-1',
      minorUserId: 'minor-1',
      canPay: true,
      canBook: false,
    });
    await guardianshipRepository.decide(g.id, 'APPROVED', new Date(), 'admin-1', null);

    const result = await canBookForMinor({ guardianUserId: 'guardian-1', minorUserId: 'minor-1' });
    expect(result).toEqual({ canBook: false });
  });

  it('returns { canBook: false } when no row exists at all', async () => {
    const result = await canBookForMinor({ guardianUserId: 'guardian-1', minorUserId: 'minor-1' });
    expect(result).toEqual({ canBook: false });
  });
});
