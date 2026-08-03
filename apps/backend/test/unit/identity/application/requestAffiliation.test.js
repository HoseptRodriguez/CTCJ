import { beforeEach, describe, expect, it } from 'vitest';
import { ROLE_CODES } from '@ctcj/shared';

import { createRequestAffiliation } from '../../../../src/modules/identity/application/useCases/requestAffiliation.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { UserNotFound } from '../../../../src/modules/identity/application/errors/UserNotFound.js';
import { AlreadyJugador } from '../../../../src/modules/identity/application/errors/AlreadyJugador.js';
import { AffiliationRequestAlreadyPending } from '../../../../src/modules/identity/application/errors/AffiliationRequestAlreadyPending.js';

import { createFakeUserRepository, createFakeAffiliationRequestRepository } from './fakes.js';

function buildDeps() {
  return {
    userRepository: createFakeUserRepository(),
    affiliationRequestRepository: createFakeAffiliationRequestRepository(),
  };
}

function buildUser({ id, roleCodes = [] } = {}) {
  const user = User.registerPublic({
    id,
    clubId: 'club-1',
    email: `${id}@example.com`,
    passwordHash: 'hashed:x',
    firstName: 'Ana',
    lastName: 'Gomez',
  });
  roleCodes.forEach((code) => user.roleCodes.add(code));
  return user;
}

describe('requestAffiliation', () => {
  let deps;
  let requestAffiliation;

  beforeEach(() => {
    deps = buildDeps();
    requestAffiliation = createRequestAffiliation(deps);
  });

  it('creates a PENDING request for a plain USUARIO', async () => {
    await deps.userRepository.create(buildUser({ id: 'user-1' }));

    const result = await requestAffiliation({ userId: 'user-1', notes: 'Quiero unirme' });

    expect(result.status).toBe('PENDING');
    expect(result.userId).toBe('user-1');
    expect(result.notes).toBe('Quiero unirme');
  });

  it('throws AlreadyJugador if the user already holds JUGADOR', async () => {
    await deps.userRepository.create(buildUser({ id: 'user-1', roleCodes: [ROLE_CODES.JUGADOR] }));

    await expect(requestAffiliation({ userId: 'user-1' })).rejects.toThrow(AlreadyJugador);
  });

  it('throws AffiliationRequestAlreadyPending if one already exists', async () => {
    await deps.userRepository.create(buildUser({ id: 'user-1' }));
    await requestAffiliation({ userId: 'user-1' });

    await expect(requestAffiliation({ userId: 'user-1' })).rejects.toThrow(
      AffiliationRequestAlreadyPending,
    );
  });

  it('throws UserNotFound for a nonexistent user', async () => {
    await expect(requestAffiliation({ userId: 'does-not-exist' })).rejects.toThrow(UserNotFound);
  });
});
