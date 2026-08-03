import { beforeEach, describe, expect, it } from 'vitest';

import { createAddAdjustment } from '../../../../src/modules/billing/application/useCases/addAdjustment.js';
import { MembershipNotFound } from '../../../../src/modules/billing/application/errors/MembershipNotFound.js';

import { createFakeMembershipRepository, createFakeAdjustmentRepository } from './fakes.js';

describe('addAdjustment', () => {
  let membershipRepository;
  let adjustmentRepository;
  let addAdjustment;
  let membershipId;

  beforeEach(async () => {
    membershipRepository = createFakeMembershipRepository();
    adjustmentRepository = createFakeAdjustmentRepository();
    addAdjustment = createAddAdjustment({ adjustmentRepository, membershipRepository });

    const membership = await membershipRepository.create({
      playerId: 'player-1',
      planId: 'plan-1',
      startDate: new Date('2026-01-01'),
      billingDay: 5,
      frequency: 'MONTHLY',
    });
    membershipId = membership.id;
  });

  it('adds an adjustment with a reason', async () => {
    const adjustment = await addAdjustment({
      membershipId,
      adjustmentType: 'SCHOLARSHIP',
      value: 100,
      reason: 'Beca deportiva 2026',
      validFrom: new Date('2026-01-01'),
      authorizedByUserId: 'admin-1',
    });
    expect(adjustment.adjustmentType).toBe('SCHOLARSHIP');
    expect(adjustment.reason).toBe('Beca deportiva 2026');
  });

  it('throws MembershipNotFound for an unknown membership id', async () => {
    await expect(
      addAdjustment({
        membershipId: 'does-not-exist',
        adjustmentType: 'DISCOUNT_PCT',
        value: 10,
        reason: 'Descuento',
        validFrom: new Date('2026-01-01'),
        authorizedByUserId: 'admin-1',
      }),
    ).rejects.toThrow(MembershipNotFound);
  });

  it.each(['DISCOUNT_PCT', 'DISCOUNT_ABS', 'SCHOLARSHIP', 'SURCHARGE', 'CUSTOM_PRICE'])(
    'accepts adjustmentType %s',
    async (adjustmentType) => {
      const adjustment = await addAdjustment({
        membershipId,
        adjustmentType,
        value: 10,
        reason: 'motivo',
        validFrom: new Date('2026-01-01'),
        authorizedByUserId: 'admin-1',
      });
      expect(adjustment.adjustmentType).toBe(adjustmentType);
    },
  );
});
