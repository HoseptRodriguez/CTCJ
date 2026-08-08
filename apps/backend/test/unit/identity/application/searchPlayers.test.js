import { beforeEach, describe, expect, it } from 'vitest';
import { ROLE_CODES } from '@ctcj/shared';

import { createSearchPlayers } from '../../../../src/modules/identity/application/useCases/searchPlayers.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';

import { createFakeUserRepository } from './fakes.js';

const CLUB_ID = 'club-1';

async function seedPlayer(userRepository, { id, firstName, lastName }) {
  const user = User.registerPublic({
    id,
    clubId: CLUB_ID,
    email: `${id}@example.com`,
    passwordHash: 'hashed:x',
    firstName,
    lastName,
  });
  user.roleCodes.add(ROLE_CODES.JUGADOR);
  await userRepository.create(user);
}

describe('searchPlayers', () => {
  let userRepository;
  let searchPlayers;

  beforeEach(() => {
    userRepository = createFakeUserRepository();
    searchPlayers = createSearchPlayers({ userRepository, clubId: CLUB_ID });
  });

  it('matches players by a case-insensitive name substring', async () => {
    await seedPlayer(userRepository, { id: 'p1', firstName: 'Ana', lastName: 'Gomez' });
    await seedPlayer(userRepository, { id: 'p2', firstName: 'Luis', lastName: 'Perez' });

    const result = await searchPlayers({ query: 'ana' });

    expect(result.players).toEqual([{ id: 'p1', firstName: 'Ana', lastName: 'Gomez' }]);
  });

  it('never includes email in the response shape', async () => {
    await seedPlayer(userRepository, { id: 'p1', firstName: 'Ana', lastName: 'Gomez' });

    const result = await searchPlayers({ query: 'ana' });

    expect(result.players[0]).not.toHaveProperty('email');
  });

  it('excludes non-JUGADOR users', async () => {
    const user = User.registerPublic({
      id: 'u1',
      clubId: CLUB_ID,
      email: 'staff@example.com',
      passwordHash: 'hashed:x',
      firstName: 'Ana',
      lastName: 'Staff',
    });
    await userRepository.create(user);

    const result = await searchPlayers({ query: 'ana' });

    expect(result.players).toHaveLength(0);
  });

  it('returns no results for a query shorter than 2 characters', async () => {
    await seedPlayer(userRepository, { id: 'p1', firstName: 'Ana', lastName: 'Gomez' });

    expect(await searchPlayers({ query: 'a' })).toEqual({ players: [] });
    expect(await searchPlayers({ query: '' })).toEqual({ players: [] });
    expect(await searchPlayers({ query: undefined })).toEqual({ players: [] });
  });
});
