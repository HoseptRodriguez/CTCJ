import { beforeEach, describe, expect, it } from 'vitest';
import { ROLE_CODES } from '@ctcj/shared';

import { createDecideAffiliationRequest } from '../../../../src/modules/identity/application/useCases/decideAffiliationRequest.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { AffiliationRequestNotFound } from '../../../../src/modules/identity/application/errors/AffiliationRequestNotFound.js';
import { AffiliationRequestNotPending } from '../../../../src/modules/identity/application/errors/AffiliationRequestNotPending.js';

import {
  createFakeUserRepository,
  createFakeAffiliationRequestRepository,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-08-02T10:00:00Z');

function buildDeps() {
  return {
    userRepository: createFakeUserRepository(),
    affiliationRequestRepository: createFakeAffiliationRequestRepository(),
    clock: createFakeClock(NOW),
  };
}

async function seedUserAndRequest(deps, { userId = 'user-1' } = {}) {
  const user = User.registerPublic({
    id: userId,
    clubId: 'club-1',
    email: `${userId}@example.com`,
    passwordHash: 'hashed:x',
    firstName: 'Ana',
    lastName: 'Gomez',
  });
  await deps.userRepository.create(user);
  const request = await deps.affiliationRequestRepository.create({ userId, notes: null });
  return { user, request };
}

describe('decideAffiliationRequest', () => {
  let deps;
  let decideAffiliationRequest;

  beforeEach(() => {
    deps = buildDeps();
    decideAffiliationRequest = createDecideAffiliationRequest(deps);
  });

  it('approve grants JUGADOR and marks the request APPROVED', async () => {
    const { request } = await seedUserAndRequest(deps);

    const result = await decideAffiliationRequest({
      requestId: request.id,
      decision: 'APPROVED',
      decidedByUserId: 'admin-1',
    });

    expect(result.status).toBe('APPROVED');
    expect(result.decidedBy).toBe('admin-1');
    expect(result.decidedAt).toEqual(NOW);

    const user = await deps.userRepository.findById('user-1');
    expect(user.hasRole(ROLE_CODES.JUGADOR)).toBe(true);
  });

  it('reject marks the request REJECTED and does not touch roles', async () => {
    const { request } = await seedUserAndRequest(deps);

    const result = await decideAffiliationRequest({
      requestId: request.id,
      decision: 'REJECTED',
      notes: 'No cumple requisitos',
      decidedByUserId: 'admin-1',
    });

    expect(result.status).toBe('REJECTED');
    expect(result.decisionNotes).toBe('No cumple requisitos');

    const user = await deps.userRepository.findById('user-1');
    expect(user.hasRole(ROLE_CODES.JUGADOR)).toBe(false);
  });

  it('throws AffiliationRequestNotFound for an unknown id', async () => {
    await expect(
      decideAffiliationRequest({
        requestId: 'does-not-exist',
        decision: 'APPROVED',
        decidedByUserId: 'admin-1',
      }),
    ).rejects.toThrow(AffiliationRequestNotFound);
  });

  it('throws AffiliationRequestNotPending if already decided', async () => {
    const { request } = await seedUserAndRequest(deps);
    await decideAffiliationRequest({
      requestId: request.id,
      decision: 'APPROVED',
      decidedByUserId: 'admin-1',
    });

    await expect(
      decideAffiliationRequest({
        requestId: request.id,
        decision: 'REJECTED',
        decidedByUserId: 'admin-1',
      }),
    ).rejects.toThrow(AffiliationRequestNotPending);
  });
});
