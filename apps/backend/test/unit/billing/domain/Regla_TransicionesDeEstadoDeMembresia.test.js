import { describe, expect, it } from 'vitest';

import { PlayerMembership } from '../../../../src/modules/billing/domain/entities/PlayerMembership.js';
import { InvalidMembershipStatusTransition } from '../../../../src/modules/billing/domain/errors/InvalidMembershipStatusTransition.js';

function buildMembership(status = 'ACTIVE') {
  return new PlayerMembership({
    id: 'membership-1',
    playerId: 'player-1',
    planId: 'plan-1',
    startDate: new Date('2026-01-01'),
    billingDay: 5,
    status,
  });
}

describe('Regla: transiciones de estado de membresía', () => {
  it('defaults to ACTIVE on construction', () => {
    const membership = new PlayerMembership({
      id: 'm1',
      playerId: 'p1',
      planId: 'pl1',
      startDate: new Date('2026-01-01'),
      billingDay: 1,
    });
    expect(membership.status).toBe('ACTIVE');
  });

  it('suspend() is legal from ACTIVE', () => {
    const membership = buildMembership('ACTIVE');
    membership.suspend();
    expect(membership.status).toBe('SUSPENDED');
  });

  it('activate() is legal from SUSPENDED', () => {
    const membership = buildMembership('SUSPENDED');
    membership.activate();
    expect(membership.status).toBe('ACTIVE');
  });

  it('suspend() throws when not currently ACTIVE', () => {
    const membership = buildMembership('SUSPENDED');
    expect(() => membership.suspend()).toThrow(InvalidMembershipStatusTransition);
  });

  it('activate() throws when not currently SUSPENDED', () => {
    const membership = buildMembership('ACTIVE');
    expect(() => membership.activate()).toThrow(InvalidMembershipStatusTransition);
  });

  it('end() is legal from ACTIVE or SUSPENDED and sets endDate', () => {
    const active = buildMembership('ACTIVE');
    const endDate = new Date('2026-06-01');
    active.end(endDate);
    expect(active.status).toBe('ENDED');
    expect(active.endDate).toBe(endDate);

    const suspended = buildMembership('SUSPENDED');
    suspended.end(endDate);
    expect(suspended.status).toBe('ENDED');
  });

  it('ENDED is terminal -- end(), activate(), and suspend() all throw afterward', () => {
    const membership = buildMembership('ENDED');
    expect(() => membership.end(new Date())).toThrow(InvalidMembershipStatusTransition);
    expect(() => membership.activate()).toThrow(InvalidMembershipStatusTransition);
    expect(() => membership.suspend()).toThrow(InvalidMembershipStatusTransition);
  });
});
