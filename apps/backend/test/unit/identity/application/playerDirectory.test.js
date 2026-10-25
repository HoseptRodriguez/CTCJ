import { describe, expect, it } from 'vitest';

import { createPlayerDirectoryUseCases } from '../../../../src/modules/identity/application/useCases/playerDirectory.js';
import { UserNotFound } from '../../../../src/modules/identity/application/errors/UserNotFound.js';

const NOW = new Date('2026-09-29T15:00:00Z');

function account(id, over = {}) {
  return {
    id,
    firstName: 'Nombre',
    lastName: id,
    email: `${id}@example.com`,
    phone: null,
    birthDate: new Date('1990-01-01'),
    avatarUrl: null,
    status: 'ACTIVE',
    membershipStatus: null,
    dominantHand: null,
    backhand: null,
    lastLoginAt: null,
    emailVerifiedAt: NOW,
    createdAt: NOW,
    deletedAt: null,
    roleCodes: ['USUARIO'],
    approvedGuardianIds: [],
    ...over,
  };
}

const PEOPLE = [
  account('ana', {
    firstName: 'Ána María',
    lastName: 'Gómez',
    phone: '310 555 1234',
    roleCodes: ['USUARIO', 'JUGADOR'],
    membershipStatus: 'ACTIVE',
    dominantHand: 'LEFT',
  }),
  account('luis', {
    firstName: 'Luis',
    lastName: 'Paz',
    roleCodes: ['USUARIO', 'JUGADOR'],
    membershipStatus: 'OVERDUE',
  }),
  account('nino', {
    firstName: 'Tomás',
    lastName: 'Rey',
    birthDate: new Date('2014-05-01'),
    roleCodes: ['USUARIO', 'JUGADOR'],
  }),
  account('sin-fecha-menor', { birthDate: null, approvedGuardianIds: ['mama'] }),
  account('baja', { status: 'DEACTIVATED' }),
  account('mama', { firstName: 'Clara', lastName: 'Rey' }),
];

function setup({ pending = ['nino'] } = {}) {
  return createPlayerDirectoryUseCases({
    userRepository: { listForDirectory: async () => PEOPLE },
    guardianshipRepository: {
      listByGuardian: async (id) =>
        id === 'mama'
          ? [
              {
                id: 'g1',
                guardianUserId: 'mama',
                minorUserId: 'nino',
                status: 'APPROVED',
                canBook: true,
                canPay: false,
              },
            ]
          : [],
      listByMinor: async (id) =>
        id === 'nino'
          ? [
              {
                id: 'g1',
                guardianUserId: 'mama',
                minorUserId: 'nino',
                status: 'APPROVED',
                canBook: true,
                canPay: false,
              },
            ]
          : [],
    },
    consentRepository: {
      listByUser: async () => [
        {
          consentType: 'PRIVACY_POLICY',
          documentVersion: '1',
          action: 'ACCEPTED',
          createdAt: NOW,
          givenBy: null,
          details: null,
        },
      ],
    },
    playerCategoryProvider: { getCategories: async () => new Map([['ana', ['TERCERA']]]) },
    isPendingGuardianAuthorization: async ({ userId }) => pending.includes(userId),
    clock: { now: () => NOW },
    clubId: 'club-1',
  });
}

const ADMIN = ['USUARIO', 'ADMINISTRADOR'];
const COACH = ['USUARIO', 'ENTRENADOR'];

describe('staff directory', () => {
  it('players tab by default, with both totals for the front desk', async () => {
    const r = await setup().listDirectory({ viewerRoles: ADMIN });
    expect(r.tab).toBe('players');
    expect(r.totals).toEqual({ players: 3, users: 6 });
    expect(r.items.map((i) => i.id)).toEqual(['ana', 'luis', 'nino']);
    expect(r.items[0]).toMatchObject({ membershipStatus: 'ACTIVE', categories: ['TERCERA'] });
  });

  it('searches by name without accents, by email and by phone digits', async () => {
    const dir = setup();
    const ids = async (q) =>
      (await dir.listDirectory({ viewerRoles: ADMIN, tab: 'all', q })).items.map((i) => i.id);
    expect(await ids('ana maria')).toEqual(['ana']);
    expect(await ids('luis@example')).toEqual(['luis']);
    expect(await ids('3105551234')).toEqual(['ana']);
  });

  it('filters: membership (incl. without), category, minor, pending authorization, deactivated', async () => {
    const dir = setup();
    const ids = async (f) =>
      (await dir.listDirectory({ viewerRoles: ADMIN, tab: 'all', ...f })).items.map((i) => i.id);
    expect(await ids({ membership: 'OVERDUE' })).toEqual(['luis']);
    expect(await ids({ membership: 'NONE', tab: 'players' })).toEqual(['nino']);
    expect(await ids({ category: 'TERCERA' })).toEqual(['ana']);
    expect(await ids({ minor: 'true' })).toEqual(['nino', 'sin-fecha-menor']);
    expect(await ids({ pendingGuardian: 'true' })).toEqual(['nino']);
    expect(await ids({ account: 'deactivated' })).toEqual(['baja']);
    expect(await ids({ account: 'active' })).not.toContain('baja');
  });

  it('coaches: players only, no memberships, and no file for non-players', async () => {
    const dir = setup();
    const r = await dir.listDirectory({ viewerRoles: COACH, tab: 'all' });
    expect(r.tab).toBe('players');
    expect(r.tabs).toEqual(['players']);
    expect(r.totals).toEqual({ players: 3 });
    expect(r.items[0]).not.toHaveProperty('membershipStatus');
    // The membership filter doesn't narrow anything for them.
    expect((await dir.listDirectory({ viewerRoles: COACH, membership: 'OVERDUE' })).total).toBe(3);

    const file = await dir.getUserFile({ viewerRoles: COACH, userId: 'ana' });
    expect(file).not.toHaveProperty('consents');
    expect(file).not.toHaveProperty('membershipStatus');
    await expect(dir.getUserFile({ viewerRoles: COACH, userId: 'mama' })).rejects.toBeInstanceOf(
      UserNotFound,
    );
  });

  it('pages of 25', async () => {
    const r = await setup().listDirectory({ viewerRoles: ADMIN, tab: 'all', page: 2 });
    expect(r).toMatchObject({ page: 2, pageSize: 25, total: 6, items: [] });
  });

  it('the front desk file has consents and the guardian links, both ways', async () => {
    const dir = setup();
    const minor = await dir.getUserFile({ viewerRoles: ADMIN, userId: 'nino' });
    expect(minor).toMatchObject({ isMinor: true, pendingGuardianAuthorization: true });
    expect(minor.guardians[0].person).toMatchObject({ firstName: 'Clara', lastName: 'Rey' });
    expect(minor.consents[0]).toMatchObject({ type: 'PRIVACY_POLICY', accepted: true });
    const mother = await dir.getUserFile({ viewerRoles: ADMIN, userId: 'mama' });
    expect(mother.minors[0].person.id).toBe('nino');
  });

  it('the export never carries the identity document or health data', async () => {
    const { rows } = await setup().exportDirectory({ viewerRoles: ADMIN, tab: 'all' });
    expect(rows).toHaveLength(6);
    const keys = Object.keys(rows[0]);
    for (const forbidden of ['documentNumber', 'documentType', 'birthDate', 'fitness', 'health']) {
      expect(keys).not.toContain(forbidden);
    }
  });
});
