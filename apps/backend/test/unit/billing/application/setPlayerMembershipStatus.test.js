import { beforeEach, describe, expect, it } from 'vitest';

import { createSetPlayerMembershipStatus } from '../../../../src/modules/billing/application/useCases/setPlayerMembershipStatus.js';
import { MembershipNotFound } from '../../../../src/modules/billing/application/errors/MembershipNotFound.js';
import { InvalidMembershipStatusTransition } from '../../../../src/modules/billing/domain/errors/InvalidMembershipStatusTransition.js';

import { createFakeMembershipRepository } from './fakes.js';

describe('setPlayerMembershipStatus', () => {
  let membershipRepository;
  let setPlayerMembershipStatus;

  beforeEach(() => {
    membershipRepository = createFakeMembershipRepository();
    setPlayerMembershipStatus = createSetPlayerMembershipStatus({ membershipRepository });
  });

  it('a valid transition updates status', async () => {
    const membership = await membershipRepository.create({
      playerId: 'player-1',
      planId: 'plan-1',
      startDate: new Date('2026-01-01'),
      billingDay: 5,
      frequency: 'MONTHLY',
    });

    const result = await setPlayerMembershipStatus({
      membershipId: membership.id,
      status: 'SUSPENDED',
    });
    expect(result.status).toBe('SUSPENDED');
  });

  it('an invalid transition throws', async () => {
    const membership = await membershipRepository.create({
      playerId: 'player-1',
      planId: 'plan-1',
      startDate: new Date('2026-01-01'),
      billingDay: 5,
      frequency: 'MONTHLY',
    });

    await expect(
      setPlayerMembershipStatus({ membershipId: membership.id, status: 'ACTIVE' }),
    ).rejects.toThrow(InvalidMembershipStatusTransition);
  });

  it('throws MembershipNotFound for an unknown id', async () => {
    await expect(
      setPlayerMembershipStatus({ membershipId: 'does-not-exist', status: 'SUSPENDED' }),
    ).rejects.toThrow(MembershipNotFound);
  });
});
