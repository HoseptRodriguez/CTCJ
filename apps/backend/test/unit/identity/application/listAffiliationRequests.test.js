import { beforeEach, describe, expect, it } from 'vitest';

import { createListAffiliationRequests } from '../../../../src/modules/identity/application/useCases/listAffiliationRequests.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';

import { createFakeUserRepository, createFakeAffiliationRequestRepository } from './fakes.js';

function buildDeps() {
  return {
    userRepository: createFakeUserRepository(),
    affiliationRequestRepository: createFakeAffiliationRequestRepository(),
  };
}

describe('listAffiliationRequests', () => {
  let deps;
  let listAffiliationRequests;

  beforeEach(() => {
    deps = buildDeps();
    listAffiliationRequests = createListAffiliationRequests(deps);
  });

  it('defaults to PENDING and enriches each row with the requester email/name', async () => {
    const user = User.registerPublic({
      id: 'user-1',
      clubId: 'club-1',
      email: 'ana@example.com',
      passwordHash: 'hashed:x',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    await deps.userRepository.create(user);
    await deps.affiliationRequestRepository.create({ userId: 'user-1', notes: null });

    const result = await listAffiliationRequests();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      status: 'PENDING',
      userEmail: 'ana@example.com',
      userFirstName: 'Ana',
      userLastName: 'Gomez',
    });
  });

  it('respects an explicit status filter', async () => {
    await deps.userRepository.create(
      User.registerPublic({
        id: 'user-1',
        clubId: 'club-1',
        email: 'ana@example.com',
        passwordHash: 'hashed:x',
        firstName: 'Ana',
        lastName: 'Gomez',
      }),
    );
    const request = await deps.affiliationRequestRepository.create({
      userId: 'user-1',
      notes: null,
    });
    await deps.affiliationRequestRepository.decide(
      request.id,
      'APPROVED',
      new Date(),
      'admin-1',
      null,
    );

    expect(await listAffiliationRequests({ status: 'PENDING' })).toHaveLength(0);
    expect(await listAffiliationRequests({ status: 'APPROVED' })).toHaveLength(1);
  });
});
