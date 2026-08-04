import { beforeEach, describe, expect, it } from 'vitest';

import { createGetUserSummaries } from '../../../../src/modules/identity/application/useCases/getUserSummaries.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';

import { createFakeUserRepository } from './fakes.js';

function buildUser(id, firstName, lastName) {
  return User.registerPublic({
    id,
    clubId: 'club-1',
    email: `${id}@example.com`,
    passwordHash: 'hashed:x',
    firstName,
    lastName,
  });
}

describe('getUserSummaries', () => {
  let userRepository;
  let getUserSummaries;

  beforeEach(() => {
    userRepository = createFakeUserRepository();
    getUserSummaries = createGetUserSummaries({ userRepository });
  });

  it('returns summaries for known ids', async () => {
    await userRepository.create(buildUser('user-1', 'Ana', 'Gomez'));
    await userRepository.create(buildUser('user-2', 'Luis', 'Ruiz'));

    const result = await getUserSummaries({ userIds: ['user-1', 'user-2'] });

    expect(result).toEqual([
      { id: 'user-1', firstName: 'Ana', lastName: 'Gomez', email: 'user-1@example.com' },
      { id: 'user-2', firstName: 'Luis', lastName: 'Ruiz', email: 'user-2@example.com' },
    ]);
  });

  it('silently omits unknown ids rather than throwing', async () => {
    await userRepository.create(buildUser('user-1', 'Ana', 'Gomez'));

    const result = await getUserSummaries({ userIds: ['user-1', 'does-not-exist'] });

    expect(result).toEqual([
      { id: 'user-1', firstName: 'Ana', lastName: 'Gomez', email: 'user-1@example.com' },
    ]);
  });

  it('returns an empty array for empty input', async () => {
    expect(await getUserSummaries({ userIds: [] })).toEqual([]);
  });
});
